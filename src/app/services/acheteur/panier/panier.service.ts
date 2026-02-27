import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PanierItem {
  produit: {
    _id: string;
    nom: string;
    prix: number;
    images: string[];
    boutique: {
      _id: string;
      nom: string;
    };
  };
  quantite: number;
  prix_unitaire: number;
  prix_total: number;
  en_promotion: boolean;
  reduction?: number;
  stock_disponible: number;  // ✅ AJOUTEZ ICI (directement dans l'item)
}

export interface Panier {
  _id: string;
  items: PanierItem[];
  total: number;
  total_original: number;
  total_economies: number;
  nombre_articles: number;
  nombre_produits_uniques: number;
}

@Injectable({
  providedIn: 'root'
})
export class PanierService {
  private apiUrl = `${environment.apiUrl}/acheteur/panier`;

  // State management
  private panierSubject = new BehaviorSubject<Panier | null>(null);
  panier$ = this.panierSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();

  constructor(private http: HttpClient) {
    this.chargerPanier(); // Charger au démarrage
  }

  /**
   * Charger le panier depuis le backend
   */
  chargerPanier(): void {
    this.loadingSubject.next(true);
    this.http.get<Panier>(this.apiUrl).subscribe({
      next: (panier) => {
        this.panierSubject.next(panier);
        this.loadingSubject.next(false);
      },
      error: (err) => {
        console.error('Erreur chargement panier:', err);
        this.panierSubject.next(null);
        this.loadingSubject.next(false);
      }
    });
  }

  /**
   * Ajouter un produit au panier
   */
  ajouterProduit(produitId: string, quantite: number = 1): Observable<any> {
    this.loadingSubject.next(true);
    return this.http.post(`${this.apiUrl}/ajouterProduitPanier`, { produitId, quantite })
      .pipe(
        tap({
          next: (response: any) => {
            this.panierSubject.next(response.panier);
            this.loadingSubject.next(false);
          },
          error: (err) => {
            this.loadingSubject.next(false);
          }
        })
      );
  }

  /**
   * Modifier la quantité d'un produit
   */
  modifierQuantite(produitId: string, quantite: number): Observable<any> {
    this.loadingSubject.next(true);
    return this.http.put(`${this.apiUrl}/modifierQuantite`, { produitId, quantite })
      .pipe(
        tap({
          next: (response: any) => {
            this.panierSubject.next(response.panier);
            this.loadingSubject.next(false);
          },
          error: (err) => {
            this.loadingSubject.next(false);
          }
        })
      );
  }

  /**
   * Supprimer un produit du panier
   */
  supprimerProduit(produitId: string): Observable<any> {
    this.loadingSubject.next(true);
    return this.http.delete(`${this.apiUrl}/supprimer/${produitId}`)
      .pipe(
        tap({
          next: (response: any) => {
            this.panierSubject.next(response.panier);
            this.loadingSubject.next(false);
          },
          error: (err) => {
            this.loadingSubject.next(false);
          }
        })
      );
  }

  /**
   * Recharger le panier depuis le backend (force une mise à jour)
   */
  rechargerPanier(): void {
    this.http.get<Panier>(this.apiUrl).subscribe({
      next: (panier) => {
        this.panierSubject.next(panier);
      },
      error: (err) => {
        console.error('Erreur rechargement panier:', err);
      }
    });
  }
  /**
   * Vider le panier
   */
  viderPanier(): Observable<any> {
    this.loadingSubject.next(true);
    return this.http.delete(`${this.apiUrl}/vider`)
      .pipe(
        tap({
          next: (response: any) => {
            // Si response.panier existe et a items = [], on le garde
            // Sinon, on force un panier vide
            const panierVide = response.panier || {
              _id: null,
              items: [],
              total: 0,
              total_original: 0,
              total_economies: 0,
              nombre_articles: 0,
              nombre_produits_uniques: 0
            };

            this.panierSubject.next(panierVide);
            this.loadingSubject.next(false);
          },
          error: (err) => {
            this.loadingSubject.next(false);
          }
        })
    );
  }

  /**
   * Obtenir le nombre d'articles (pour badge)
   */
  getNombreArticles(): number {
    return this.panierSubject.value?.nombre_articles || 0;
  }

  /**
   * Vérifier si le panier est vide
   */
  estVide(): boolean {
    return !this.panierSubject.value || this.panierSubject.value.nombre_articles === 0;
  }

  /**
   * Valider le panier et créer les commandes
   * @param notes Notes optionnelles pour la commande
   * @returns Observable avec la réponse détaillée du backend
   */
  validerPanier(notes?: string): Observable<any> {
    this.loadingSubject.next(true);

    console.log('🔄 Validation du panier en cours...', notes ? `Notes: ${notes}` : '');

    return this.http.post(`${this.apiUrl}/validerPanier`, { notes })
      .pipe(
        tap({
          next: (response: any) => {
            // ✅ Succès - Log détaillé
            console.log('✅✅✅ PANIER VALIDÉ AVEC SUCCÈS ✅✅✅');
            console.log('📦 Réponse complète:', response);
            console.log('📊 Résumé:', response.resume);
            console.log('🏪 Commandes créées:', response.commandes?.length || 0);
            console.log('💰 Total global:', response.resume?.total_global);

            // Panier vidé après validation
            this.panierSubject.next(null);
            this.loadingSubject.next(false);
          },
          error: (err) => {
            // ❌ Erreur - Log détaillé
            console.error('❌❌❌ ERREUR VALIDATION PANIER ❌❌❌');
            console.error('Status:', err.status);
            console.error('Message:', err.error?.message || err.message);
            console.error('Détails:', err.error);

            this.loadingSubject.next(false);
          }
        })
    );
  }
}
