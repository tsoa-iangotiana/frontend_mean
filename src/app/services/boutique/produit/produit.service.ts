

// services/boutique/produit.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { BoutiqueContextService } from '../context/boutique.context.service';
import { Boutique, Categorie } from '../profil/profil.service';
import { ToastService } from '../../utils/toast/toast.service';

export interface Produit {
  _id: string;
  nom: string;
  description?: string;
  prix: number;
  unite: 'unite' | 'kg' | 'litre' | 'metre';
  stock: number;
  images: string[];
  categorie: Categorie
  boutique: Boutique;
  actif: boolean;
  note_moyenne: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProduitInput {
  nom: string;
  description?: string;
  prix: number;
  unite?: 'unite' | 'kg' | 'litre' | 'metre';
  stock?: number;
  images?: string[];
  categorie: string;
  actif?: boolean;
}

export interface ProduitsResponse {
  produits: Produit[];
  totalPages: number;
  currentPage: number;
  total: number;
}

export interface SituationStock {
  produit_id: string;
  nom: string;
  stock_actuel: number;
  unite: string;
  alerte_stock: boolean;
  seuil_alerte: number;
  statut: 'RUPTURE' | 'FAIBLE' | 'NORMAL';
}

export interface StockUpdate {
  quantite: number;
  operation: 'SET' | 'ADD' | 'SUBTRACT';
}


@Injectable({
  providedIn: 'root'
})
export class ProduitService {
  private apiUrl = `${environment.apiUrl}/produit`;

  constructor(
    private http: HttpClient,
    private boutiqueContext: BoutiqueContextService,
    private toastService: ToastService
  ) {}

  /**
   * Vérifie qu'une boutique est sélectionnée et retourne son ID
   * @throws Error si aucune boutique sélectionnée
   */
  private getBoutiqueId(): string {
    const boutique = this.boutiqueContext.getBoutiqueSelectionnee();
    if (!boutique?._id) {
      const error = 'Aucune boutique sélectionnée';
      this.toastService.show(error, 'warning');
      throw new Error(error);
    }
    return boutique._id;
  }

  /**
   * Créer un ou plusieurs produits pour la boutique sélectionnée
   */
  createProduits(produits: ProduitInput[]): Observable<{ message: string; produits: Produit[] }> {
    try {
      const boutiqueId = this.getBoutiqueId();
      
      // Validation supplémentaire
      if (!produits.length) {
        throw new Error('Au moins un produit requis');
      }

      return this.http.post<{ message: string; produits: Produit[] }>(
        this.apiUrl, 
        { 
          produits,
          boutiqueId  // ← Envoi explicite de l'ID boutique
        }
      ).pipe(
        catchError(this.handleError('création des produits'))
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Récupérer tous les produits de la boutique sélectionnée
   */
  getProduits(params?: {
    page?: number;
    limit?: number;
    actif?: boolean;
    categorie?: string;
    search?: string;
  }): Observable<ProduitsResponse> {
    try {
      const boutiqueId = this.getBoutiqueId();
      
      let httpParams = new HttpParams()
        .set('boutiqueId', boutiqueId)  // ← Ajout obligatoire
        .set('page', params?.page?.toString() || '1')
        .set('limit', params?.limit?.toString() || '20');

      if (params?.actif !== undefined) {
        httpParams = httpParams.set('actif', params.actif.toString());
      }
      if (params?.categorie) {
        httpParams = httpParams.set('categorie', params.categorie);
      }
      if (params?.search) {
        httpParams = httpParams.set('search', params.search);
      }

      return this.http.get<ProduitsResponse>(this.apiUrl, { params: httpParams })
        .pipe(
          catchError(this.handleError('chargement des produits'))
        );
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Récupérer un produit par ID (vérifie l'appartenance à la boutique)
   */
  getProduit(id: string): Observable<Produit> {
    try {
      const boutiqueId = this.getBoutiqueId();
      
      return this.http.get<Produit>(`${this.apiUrl}/${id}`, {
        params: new HttpParams().set('boutiqueId', boutiqueId)
      }).pipe(
        catchError(this.handleError('chargement du produit'))
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Mettre à jour un produit
   */
  updateProduit(id: string, produit: Partial<ProduitInput>): Observable<Produit> {
    try {
      const boutiqueId = this.getBoutiqueId();
      
      return this.http.put<Produit>(
        `${this.apiUrl}/${id}`, 
        {
          ...produit,
          boutiqueId  // ← Pour vérification back-end
        }
      ).pipe(
        catchError(this.handleError('mise à jour du produit'))
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Supprimer un produit
   */
  deleteProduit(id: string): Observable<{ message: string }> {
    try {
      // Option 1: Envoyer boutiqueId dans le body (si DELETE accepte body)
      return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`
      ).pipe(
        catchError(this.handleError('suppression du produit'))
      );
      // Option 2: Utiliser les params (si l'API supporte les query params)
      // return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`, {
      //   params: new HttpParams().set('boutiqueId', boutiqueId)
      // });
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Obtenir situation de stock
   */
  getSituationStock(id: string): Observable<SituationStock> {
    try {
      const boutiqueId = this.getBoutiqueId();
      
      return this.http.get<SituationStock>(`${this.apiUrl}/${id}/stock`, {
        params: new HttpParams().set('boutiqueId', boutiqueId)
      }).pipe(
        catchError(this.handleError('récupération du stock'))
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Mettre à jour le stock
   */
  updateStock(id: string, update: StockUpdate): Observable<{ message: string; produit: any }> {
    try {
      const boutiqueId = this.getBoutiqueId();
      
      return this.http.put<{ message: string; produit: any }>(
        `${this.apiUrl}/${id}/stock`, 
        {
          ...update,
          boutiqueId  // ← Vérification
        }
      ).pipe(
        catchError(this.handleError('mise à jour du stock'))
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Upload d'images pour un produit
   */
  uploadProductImages(produitId: string, files: File[]): Observable<{ images: string[] }> {
    try {
      const boutiqueId = this.getBoutiqueId();
      const formData = new FormData();
      
      files.forEach(file => {
        formData.append('images', file);
      });
      formData.append('boutiqueId', boutiqueId);

      return this.http.post<{ images: string[] }>(
        `${environment.apiUrl}/upload/produit-images/${produitId}`,
        formData
      ).pipe(
        catchError(this.handleError('upload des images'))
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  /**
   * Gestion centralisée des erreurs
   */
  private handleError(operation: string) {
    return (error: any): Observable<never> => {
      console.error(`Erreur lors de ${operation}:`, error);
      
      let message = `Erreur lors de ${operation}`;
      if (error.error?.message) {
        message = error.error.message;
      } else if (error.status === 403) {
        message = 'Vous n\'avez pas les droits pour cette opération';
      } else if (error.status === 404) {
        message = 'Ressource non trouvée';
      } else if (error.status === 400) {
        message = error.error?.message || 'Données invalides';
      }

      this.toastService.show(message, 'error');
      return throwError(() => error);
    };
  }

  /**
   * Version asynchrone avec switchMap pour les cas complexes
   */
  createProduitsSafe(produits: ProduitInput[]): Observable<{ message: string; produits: Produit[] }> {
    return this.boutiqueContext.boutiqueSelectionnee$.pipe(
      switchMap(boutique => {
        if (!boutique?._id) {
          throw new Error('Aucune boutique sélectionnée');
        }
        return this.http.post<{ message: string; produits: Produit[] }>(
          this.apiUrl, 
          { 
            produits,
            boutiqueId: boutique._id
          }
        );
      }),
      catchError(this.handleError('création des produits'))
    );
  }
}