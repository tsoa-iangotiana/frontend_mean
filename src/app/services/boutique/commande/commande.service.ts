import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { User } from '../../auth';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES & INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

export type StatutCommande = 'EN_ATTENTE' | 'PAYEE' | 'LIVREE' | 'RECUPEREE' | 'ANNULEE';
export type TypeCommande   = 'livraison' | 'recuperation';
export type TriCommande    = 'date_asc' | 'date_desc' | 'montant_asc' | 'montant_desc' | 'statut';

// ── Commande ─────────────────────────────────────────────────────────────────

export interface Livraison {
  adresse:  string;
  distance: number;
  frais:    number;
}

export interface ApercuProduit {
  nom:           string;
  image:         string | null;
  quantite:      number;
  prix_unitaire: number;
}

export interface StatutInfo {
  label:   string;
  couleur: 'orange' | 'blue' | 'green' | 'red' | 'grey';
}


export interface CommandeEnrichie {
  _id:             string;
  boutique:        string;
  utilisateur:     User;
  date:            string;
  montant_total:   number;
  montant_total_avec_livraison: number;
  statut:          StatutCommande;
  statut_info:     StatutInfo;
  nombre_articles: number;
  apercu_produits: ApercuProduit[];
  livraison:       Livraison | null;
  peut_annuler:    boolean;
  peut_livrer:     boolean;
  peut_recuperer:  boolean;
}

// ── Réponse liste commandes ───────────────────────────────────────────────────

export interface Pagination {
  page:  number;
  limit: number;
  total: number;
  pages: number;
}

export interface RepartitionStatuts {
  EN_ATTENTE: number;
  PAYEE:      number;
  LIVREE:     number;
  RECUPEREE:  number;
  ANNULEE:    number;
}

export interface StatistiquesCommandes {
  total_commandes:     number;
  total_depense_avec_livraison: number;
  total_depense:       number;
  
  moyenne_panier:      number;
  repartition_statuts: RepartitionStatuts;
}

export interface FiltresAppliques {
  boutique:    string;
  utilisateur: string | null;
  statut:      string;
  date_debut:  string | null;
  date_fin:    string | null;
  tri:         TriCommande;
}

export interface CommandesResponse {
  message:          string;
  commandes:        CommandeEnrichie[];
  pagination:       Pagination;
  statistiques:     StatistiquesCommandes;
  filtres_appliques: FiltresAppliques;
  total_en_attente: number;
}

// ── Paramètres de filtre ──────────────────────────────────────────────────────

export interface CommandesFiltres {
  statut?:     StatutCommande | string; // string pour multi ex: 'EN_ATTENTE,LIVREE'
  utilisateur?: string;
  date_debut?: string;                  // format YYYY-MM-DD
  date_fin?:   string;                  // format YYYY-MM-DD
  prix_min?:   number;
  prix_max?:   number;
  tri?:        TriCommande;
  page?:       number;
  limit?:      number;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface PeriodeStat {
  ca:           number;
  nb_commandes: number;
}

export interface Periodes {
  aujourd_hui:                       PeriodeStat;
  semaine:                           PeriodeStat;
  mois_en_cours:                     PeriodeStat;
  mois_precedent:                    PeriodeStat;
  evolution_ca_vs_mois_precedent:    string; // ex: "+14.3%" ou "N/A"
}

export interface EvolutionJour {
  date:         string; // YYYY-MM-DD
  ca:           number;
  nb_commandes: number;
}

export interface TopProduit {
  produit_id:  string;
  nom:         string;
  image:       string | null;
  total_vendu: number;
  ca_genere:   number;
}

export interface TopClient {
  client_id:     string;
  nom:           string;
  prenom:        string;
  email:         string;
  nb_commandes:  number;
  total_depense: number;
}

export interface HeureDePointe {
  heure:        number; // 0–23
  nb_commandes: number;
}

export interface BoutiqueClassement {
  boutique_id:          string;
  nom:                  string;
  photo:                string | null;
  nb_commandes:         number;
  ca_total:             number;
  est_boutique_courante: boolean;
}

export interface ClassementBoutiques {
  rang_boutique_courante: number | null;
  top_10:                 BoutiqueClassement[];
}

export interface ResumeGlobal {
  total_commandes:   number;
  ca_total:          number;
  moyenne_panier:    number;
  repartition_statuts: Omit<RepartitionStatuts, 'PAYEE'>;
  repartition_types: {
    livraison:    number;
    recuperation: number;
  };
}

export interface DashboardResponse {
  boutique_id:          string;
  genere_le:            string;
  resume:               ResumeGlobal;
  periodes:             Periodes;
  evolution_journaliere: EvolutionJour[];
  top_produits:         TopProduit[];
  top_clients:          TopClient[];
  heures_de_pointe:     HeureDePointe[];
  classement_boutiques: ClassementBoutiques;
}

// ── Réponse action (livrer / récupérer) ───────────────────────────────────────

export interface ActionCommandeResponse {
  success: boolean;
  message: string;
  data:    any;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class CommandeBoutiqueService {

  private readonly baseUrl = environment.apiUrl; // ex: 'http://localhost:3000/api'

  constructor(private http: HttpClient) {}

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Construit l'URL de base pour une boutique donnée */
  private url(boutiqueId: string, ...segments: string[]): string {
    return [this.baseUrl, 'boutique/commande', boutiqueId,...segments]
      .filter(Boolean)
      .join('/');
  }

  /** Convertit un objet de filtres en HttpParams (ignore les valeurs null/undefined) */
  private buildParams(filtres: CommandesFiltres): HttpParams {
    let params = new HttpParams();
    Object.entries(filtres).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return params;
  }

  // ── GET /boutique/:boutiqueId/commandes/dashboard ──────────────────────────

  /**
   * Récupère toutes les métriques du dashboard d'une boutique.
   * Inclut : résumé global, CA par période, évolution 30j,
   * top produits, top clients, heures de pointe, classement boutiques.
   */
  getDashboard(boutiqueId: string): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(this.url(boutiqueId, 'dashboard'));
  }

  // ── GET /boutique/:boutiqueId/commandes ────────────────────────────────────

  /**
   * Récupère les commandes d'une boutique avec filtres, tri et pagination.
   *
   * @param boutiqueId - ID de la boutique (obligatoire)
   * @param filtres    - Filtres optionnels (statut, utilisateur, dates, montants, tri, pagination)
   *
   * @example
   * // Commandes en attente (défaut)
   * this.commandeService.getCommandes(boutiqueId);
   *
   * @example
   * // Commandes d'un client spécifique
   * this.commandeService.getCommandes(boutiqueId, { utilisateur: clientId, statut: 'LIVREE,RECUPEREE' });
   *
   * @example
   * // Commandes du mois avec pagination
   * this.commandeService.getCommandes(boutiqueId, {
   *   date_debut: '2026-02-01',
   *   date_fin:   '2026-02-28',
   *   page: 2,
   *   limit: 20
   * });
   */
 getCommandes(boutiqueId: string, filtres: CommandesFiltres = {}): Observable<CommandesResponse> {
  const params = this.buildParams(filtres);
  
  return this.http.get<CommandesResponse>(this.url(boutiqueId), { params }).pipe(
    tap({
      next: (response) => {
        console.log('✅ Réponse complète:', response);
        console.log('📦 Commandes reçues:', response.commandes);
        console.log('📊 Statistiques:', response.statistiques);
        console.log('📄 Pagination:', response.pagination);
      },
      error: (error) => {
        console.error('❌ Erreur réponse:', error);
      }
    })
  );
}

  // ── PATCH /boutique/:boutiqueId/commandes/:commandeId/livrer ───────────────

  /**
   * Marque une commande comme LIVRÉE.
   * Conditions : livraison != null ET statut === 'EN_ATTENTE'.
   */
  marquerLivree(boutiqueId: string, commandeId: string): Observable<ActionCommandeResponse> {
    return this.http.patch<ActionCommandeResponse>(
      this.url(boutiqueId, commandeId, 'livrer'),
      {}
    );
  }

  // ── PATCH /boutique/:boutiqueId/commandes/:commandeId/recuperer ────────────

  /**
   * Marque une commande comme RÉCUPÉRÉE en boutique.
   * Conditions : livraison == null ET statut === 'EN_ATTENTE'.
   */
  marquerRecuperee(boutiqueId: string, commandeId: string): Observable<ActionCommandeResponse> {
    return this.http.patch<ActionCommandeResponse>(
      this.url(boutiqueId, commandeId, 'recuperer'),
      {}
    );
  }

  // ── Helpers métier (utilisables dans les composants) ──────────────────────

  /**
   * Détermine l'action disponible sur une commande et retourne
   * la méthode correspondante à appeler.
   * Utile pour un bouton unique "Valider" dans le template.
   */
  validerCommande(
    boutiqueId: string,
    commande: CommandeEnrichie
  ): Observable<ActionCommandeResponse> | null {
    if (commande.peut_livrer)    return this.marquerLivree(boutiqueId, commande._id);
    if (commande.peut_recuperer) return this.marquerRecuperee(boutiqueId, commande._id);
    return null;
  }
}