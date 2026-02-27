// dashboard.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES — Typage complet des réponses API
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ── Overview ──────────────────────────────────────────────────────────────────

export interface StatutCount {
  statut: string;
  total: number;
}

export interface OverviewData {
  boxes: {
    total: number;
    occupees: number;
    libres: number;
    taux_occupation: number;
  };
  boutiques: {
    total: number;
    actives: number;
    inactives: number;
  };
  loyers: {
    mois_en_cours: number;
    nb_en_retard: number;
  };
  commandes: {
    total_30j: number;
    repartition_statuts: StatutCount[];
  };
  tickets: {
    ouverts: number;
    urgents_non_resolus: number;
  };
  satisfaction: {
    note_moyenne_centre: number;
    total_avis: number;
  };
}

// ── Boxes ─────────────────────────────────────────────────────────────────────

export interface BoutiqueActuelle {
  id: string;
  nom: string;
}

export interface BoxDetail {
  _id: string;
  numero: string;
  surface: number;
  prix_loyer: number;
  libre: boolean;
  boutique_actuelle: BoutiqueActuelle | null;
}

export interface BoxesData {
  total: number;
  occupees: number;
  libres: number;
  taux_occupation: number;
  detail: BoxDetail[];
}

// ── Boutiques ─────────────────────────────────────────────────────────────────

export interface BoutiqueItem {
  _id: string;
  nom: string;
  active: boolean;
  note_moyenne: number;
  nb_commandes: number;
  profil_photo?: string;
  slogan?: string;
  box?: { numero: string; surface: number; prix_loyer: number };
  categories?: { _id: string; nom: string }[];
}

export interface BoutiquesData {
  total: number;
  actives: number;
  inactives: number;
  liste: BoutiqueItem[];
}

export type TriBoutiques = 'note' | 'commandes';
export type FiltreActif  = 'true' | 'false' | 'all';

// ── Finances ──────────────────────────────────────────────────────────────────

export interface MoisEvolution {
  annee: number;
  mois: number;
  label: string;
  total: number;
}

export type StatutPaiementEnum = 'A_JOUR' | 'EN_RETARD' | 'AUCUN_PAIEMENT';

export interface StatutPaiement {
  boutique_id: string;
  nom: string;
  statut: StatutPaiementEnum;
  date_fin: string | null;
  periode?: 'mensuel' | 'trimestriel' | 'annuel';
}

export interface FinancesData {
  total_periode: number;
  mois_en_cours: number;
  evolution_mensuelle: MoisEvolution[];
  statut_paiements: StatutPaiement[];
  nb_en_retard: number;
}

// ── Commandes ─────────────────────────────────────────────────────────────────

export interface MoisCommandesEvolution extends MoisEvolution {
  click_collect: number;
  livraison: number;
}

export interface TopBoutique {
  boutique_id: string;
  nom: string;
  nb_commandes: number;
}

export interface CommandesData {
  total_periode: number;
  repartition_statuts: StatutCount[];
  evolution_mensuelle: MoisCommandesEvolution[];
  top_boutiques: TopBoutique[];
}

// ── Tickets ───────────────────────────────────────────────────────────────────

export type StatutTicket   = 'OUVERT' | 'EN_COURS' | 'RESOLU' | 'TOUS';
export type PrioriteTicket = 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENT' | 'TOUS';

export interface PrioriteCount {
  priorite: string;
  total: number;
}

export interface TicketResume {
  _id: string;
  boutique: { _id: string; nom: string };
  sujet: string;
  description: string;
  statut: Exclude<StatutTicket, 'TOUS'>;
  priorite: Exclude<PrioriteTicket, 'TOUS'>;
  createdAt: string;
}

export interface TicketsData {
  compteurs: {
    par_statut: StatutCount[];
    par_priorite: PrioriteCount[];
  };
  tickets_urgents: TicketResume[];
  liste: TicketResume[];
}

export interface TicketsFiltres {
  statut?: StatutTicket;
  priorite?: PrioriteTicket;
  limite?: number;
}

// ── Avis ──────────────────────────────────────────────────────────────────────

export interface DistributionNote {
  note: number;
  label: string;
  total: number;
}

export interface TopBoutiqueAvis {
  _id: string;
  nom: string;
  note_moyenne: number;
  box?: { numero: string };
}

export interface AvisResume {
  _id: string;
  boutique_nom: string;
  note: number;
  commentaire?: string;
  createdAt: string;
  utilisateur?: { nom: string; prenom: string };
}

export interface AvisData {
  note_moyenne_centre: number;
  total_avis: number;
  distribution_notes: DistributionNote[];
  top_boutiques: TopBoutiqueAvis[];
  derniers_avis: AvisResume[];
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DashboardService {

  /** Préfixe commun à toutes les routes du dashboard admin */
   private apiUrl = `${environment.apiUrl}/admin/dashboard`;

  constructor(private http: HttpClient) {}

  // ── Helper : extrait data depuis l'enveloppe { success, data } ──────────────
  private extract<T>(obs$: Observable<ApiResponse<T>>): Observable<T> {
    return obs$.pipe(map((res) => res.data));
  }

  /**
   * Snapshot global — appelé au chargement du dashboard.
   * Toutes les requêtes sont exécutées en parallèle côté serveur.
   */
  getOverview(): Observable<OverviewData> {
    return this.extract(
      this.http.get<ApiResponse<OverviewData>>(`${this.apiUrl}/overview`)
    );
  }

  /**
   * Statistiques des boxes : taux d'occupation, détail par box.
   */
  getBoxesStats(): Observable<BoxesData> {
    return this.extract(
      this.http.get<ApiResponse<BoxesData>>(`${this.apiUrl}/boxes`)
    );
  }

  /**
   * Liste et statistiques des boutiques.
   * @param tri   - Trier par 'note' (défaut) ou 'commandes'
   * @param actif - Filtrer : 'true' | 'false' | 'all' (défaut)
   */
  getBoutiquesStats(tri: TriBoutiques = 'note', actif: FiltreActif = 'all'): Observable<BoutiquesData> {
    const params = new HttpParams()
      .set('tri',   tri)
      .set('actif', actif);
    return this.extract(
      this.http.get<ApiResponse<BoutiquesData>>(`${this.apiUrl}/boutiques`, { params })
    );
  }

  /**
   * Statistiques financières : évolution loyers, statuts paiements.
   * @param mois - Nombre de mois d'historique (défaut : 6)
   */
  getFinancesStats(mois: number = 6): Observable<FinancesData> {
    const params = new HttpParams().set('mois', mois.toString());
    return this.extract(
      this.http.get<ApiResponse<FinancesData>>(`${this.apiUrl}/finances`, { params })
    );
  }

  /**
   * Statistiques des commandes : volumes, statuts, top boutiques.
   * @param mois - Nombre de mois d'historique (défaut : 6)
   */
  getCommandesStats(mois: number = 6): Observable<CommandesData> {
    const params = new HttpParams().set('mois', mois.toString());
    return this.extract(
      this.http.get<ApiResponse<CommandesData>>(`${this.apiUrl}/commandes`, { params })
    );
  }

  /**
   * Statistiques des tickets : compteurs, urgents, liste filtrée.
   * @param filtres - { statut?, priorite?, limite? }
   */
  getTicketsStats(filtres: TicketsFiltres = {}): Observable<TicketsData> {
    let params = new HttpParams();
    if (filtres.statut)   params = params.set('statut',   filtres.statut);
    if (filtres.priorite) params = params.set('priorite', filtres.priorite);
    if (filtres.limite)   params = params.set('limite',   filtres.limite.toString());
    return this.extract(
      this.http.get<ApiResponse<TicketsData>>(`${this.apiUrl}/tickets`, { params })
    );
  }

  /**
   * Statistiques d'avis & satisfaction.
   * @param limite - Nombre de derniers avis à retourner (défaut : 10)
   */
  getAvisStats(limite: number = 10): Observable<AvisData> {
    const params = new HttpParams().set('limite', limite.toString());
    return this.extract(
      this.http.get<ApiResponse<AvisData>>(`${this.apiUrl}/avis`, { params })
    );
  }
}