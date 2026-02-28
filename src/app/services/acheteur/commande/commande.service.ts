import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, Observable, of } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface ProduitApercu {
  nom: string;
  image: string | null;
  quantite: number;
  prix_unitaire: number;
}

export interface StatutInfo {
  libelle: string;
  couleur: 'orange' | 'blue' | 'green' | 'red' | 'gray';
  icon: string;
  description: string;
}

export interface CommandeListe {
  _id: string;
  boutique: string;
  date: string;
  montant_total: number;
  statut: 'EN_ATTENTE' | 'PAYEE' | 'LIVREE' | 'ANNULEE';
  statut_info: StatutInfo;
  nombre_articles: number;
  apercu_produits: ProduitApercu[];
  peut_annuler: boolean;
  peut_payer: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface StatistiquesCommandes {
  total_commandes: number;
  total_depense: number;
  moyenne_panier: number;
  repartition_statuts: {
    EN_ATTENTE: number;
    PAYEE: number;
    LIVREE: number;
    ANNULEE: number;
  };
}

export interface FiltresAppliques {
  statut: string;
  date_debut: string | null;
  date_fin: string | null;
  tri: string;
}

export interface CommandesResponse {
  commandes: CommandeListe[];
  pagination: Pagination;
  statistiques: StatistiquesCommandes;
  filtres_appliques: FiltresAppliques;
  message?: string;
  total_en_attente?: number;
}

export interface CommandesFilters {
  statut?: string;
  boutique?: string;
  date_debut?: string;
  date_fin?: string;
  prix_min?: number;
  prix_max?: number;
  tri?: 'date_desc' | 'date_asc' | 'montant_desc' | 'montant_asc' | 'statut';
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CommandeService {
  private apiUrl = `${environment.apiUrl}/acheteur/commande`;

  constructor(private http: HttpClient) {}

  /**
   * Récupérer la liste des commandes avec filtres
   * @param filters Filtres optionnels
   * @returns Observable<CommandesResponse>
   */
  getCommandes(filters?: CommandesFilters): Observable<CommandesResponse> {
    let params = new HttpParams();

    if (filters) {
      // Statut (peut être multiple: "EN_ATTENTE,PAYEE")
      if (filters.statut) {
        params = params.set('statut', filters.statut);
      }

      // Filtre par boutique
      if (filters.boutique) {
        params = params.set('boutique', filters.boutique);
      }

      // Filtres par date
      if (filters.date_debut) {
        params = params.set('date_debut', filters.date_debut);
      }
      if (filters.date_fin) {
        params = params.set('date_fin', filters.date_fin);
      }

      // Filtres par prix
      if (filters.prix_min !== undefined) {
        params = params.set('prix_min', filters.prix_min.toString());
      }
      if (filters.prix_max !== undefined) {
        params = params.set('prix_max', filters.prix_max.toString());
      }

      // Tri
      if (filters.tri) {
        params = params.set('tri', filters.tri);
      }

      // Pagination
      if (filters.page) {
        params = params.set('page', filters.page.toString());
      }
      if (filters.limit) {
        params = params.set('limit', filters.limit.toString());
      }
    }

    // Par défaut, on affiche les commandes en attente si aucun filtre
    if (!filters?.statut && !filters?.page) {
      params = params.set('statut', 'EN_ATTENTE');
    }

    console.log('🔍 Récupération des commandes avec params:', params.toString());

    return this.http.get<CommandesResponse>(this.apiUrl, { params });
  }

  /**
   * Récupérer uniquement les commandes en attente
   * @param page Numéro de page
   * @param limit Éléments par page
   * @returns Observable<CommandesResponse>
   */
  getCommandesEnAttente(page: number = 1, limit: number = 10): Observable<CommandesResponse> {
    return this.getCommandes({
      statut: 'EN_ATTENTE',
      page,
      limit,
      tri: 'date_desc'
    });
  }

  /**
   * Vérifier si l'utilisateur a des commandes en attente
   * @returns Observable<boolean>
   */
  hasCommandesEnAttente(): Observable<boolean> {
    return this.getCommandesEnAttente(1, 1).pipe(
      map(response => (response.total_en_attente ?? 0) > 0 || (response.commandes?.length ?? 0) > 0),
      catchError(() => of(false))
    );
  }

  /**
   * Récupérer toutes les commandes (sans filtre de statut)
   * @param page Numéro de page
   * @param limit Éléments par page
   * @returns Observable<CommandesResponse>
   */
  getAllCommandes(page: number = 1, limit: number = 10): Observable<CommandesResponse> {
    return this.getCommandes({ page, limit });
  }

  /**
   * Récupérer les commandes payées
   * @param page Numéro de page
   * @param limit Éléments par page
   * @returns Observable<CommandesResponse>
   */
  getCommandesPayees(page: number = 1, limit: number = 10): Observable<CommandesResponse> {
    return this.getCommandes({
      statut: 'PAYEE',
      page,
      limit,
      tri: 'date_desc'
    });
  }

  /**
   * Récupérer les commandes livrées
   * @param page Numéro de page
   * @param limit Éléments par page
   * @returns Observable<CommandesResponse>
   */
  getCommandesLivrees(page: number = 1, limit: number = 10): Observable<CommandesResponse> {
    return this.getCommandes({
      statut: 'LIVREE',
      page,
      limit,
      tri: 'date_desc'
    });
  }

  /**
   * Récupérer les commandes annulées
   * @param page Numéro de page
   * @param limit Éléments par page
   * @returns Observable<CommandesResponse>
   */
  getCommandesAnnulees(page: number = 1, limit: number = 10): Observable<CommandesResponse> {
    return this.getCommandes({
      statut: 'ANNULEE',
      page,
      limit,
      tri: 'date_desc'
    });
  }

  /**
   * Rechercher des commandes par période
   * @param date_debut Date de début (YYYY-MM-DD)
   * @param date_fin Date de fin (YYYY-MM-DD)
   * @param page Numéro de page
   * @param limit Éléments par page
   * @returns Observable<CommandesResponse>
   */
  getCommandesByPeriode(
    date_debut: string,
    date_fin: string,
    page: number = 1,
    limit: number = 10
  ): Observable<CommandesResponse> {
    return this.getCommandes({
      date_debut,
      date_fin,
      page,
      limit,
      tri: 'date_desc'
    });
  }

  /**
   * Formater le statut pour l'affichage
   */
  static getStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'EN_ATTENTE': 'En attente',
      'PAYEE': 'Payée',
      'LIVREE': 'Livrée',
      'ANNULEE': 'Annulée'
    };
    return labels[statut] || statut;
  }

  /**
   * Obtenir la couleur associée au statut
   */
  static getStatutColor(statut: string): string {
    const colors: { [key: string]: string } = {
      'EN_ATTENTE': 'orange',
      'PAYEE': 'blue',
      'LIVREE': 'green',
      'ANNULEE': 'red'
    };
    return colors[statut] || 'gray';
  }

  /**
   * Obtenir l'icône associée au statut
   */
  static getStatutIcon(statut: string): string {
    const icons: { [key: string]: string } = {
      'EN_ATTENTE': '⏳',
      'PAYEE': '✓',
      'LIVREE': '✅',
      'ANNULEE': '✗'
    };
    return icons[statut] || '•';
  }

  /**
   * Payer une commande (mettre à jour le statut et enregistrer la livraison si nécessaire)
   * @param data Données de paiement (sans mode_paiement)
   * @returns Observable
   */
  payerCommande(data: {
    commandeId: string;
    livraison?: {
      adresse: string;
      distance: number;
      frais: number;
    }
  }): Observable<any> {
    return this.http.put(`${this.apiUrl}/${data.commandeId}/payer`, data);
  }
}
