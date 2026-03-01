import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface BoutiqueResume {
  _id: string;
  nom: string;
  profil_photo: string | null;
  active: boolean;
}

export interface RepartitionStatuts {
  EN_ATTENTE: number;
  PAYEE:      number;
  LIVREE:     number;
  RECUPEREE:  number;
  ANNULEE:    number;
}

export interface RepartitionTypes {
  livraison:    number;
  recuperation: number;
}

export interface Resume {
  total_commandes:     number;
  ca_total:            number;
  moyenne_panier:      number;
  repartition_statuts: RepartitionStatuts;
  repartition_types:   RepartitionTypes;
}

export interface PeriodeStats {
  ca:           number;
  nb_commandes: number;
}

export interface Periodes {
  aujourd_hui:                      PeriodeStats;
  semaine:                          PeriodeStats;
  mois_en_cours:                    PeriodeStats;
  mois_precedent:                   PeriodeStats;
  evolution_ca_vs_mois_precedent:   string; // ex: "+12.5%" ou "N/A"
}

export interface EvolutionJournaliere {
  date:         string;  // "YYYY-MM-DD"
  ca:           number;
  nb_commandes: number;
}

export interface PerformanceBoutique {
  boutique_id:    string;
  nom:            string;
  photo:          string | null;
  active:         boolean;
  nb_commandes:   number;
  ca_total:       number;
  moyenne_panier: number;
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
  heure:        number;
  nb_commandes: number;
}

export interface DashboardResponsable {
  responsable_id:           string;
  genere_le:                string;
  nb_boutiques:             number;
  boutiques:                BoutiqueResume[];
  resume:                   Resume;
  periodes:                 Periodes;
  evolution_journaliere:    EvolutionJournaliere[];
  performances_par_boutique: PerformanceBoutique[];
  top_produits:             TopProduit[];
  top_clients:              TopClient[];
  heures_de_pointe:         HeureDePointe[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class DashboardResponsableService {

  private readonly apiUrl = environment.apiUrl + '/boutique/commande';

  constructor(private http: HttpClient) {}

  /**
   * Récupère le dashboard global de toutes les boutiques d'un responsable
   * GET /responsable/:responsableId/dashboard
   */
  getDashboardResponsable(responsableId: string): Observable<DashboardResponsable> {
    return this.http.get<DashboardResponsable>(
      `${this.apiUrl}/responsable/${responsableId}/dashboard`
    );
  }
}