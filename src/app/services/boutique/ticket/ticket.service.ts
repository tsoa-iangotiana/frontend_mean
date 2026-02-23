// services/boutique/ticket/ticket.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BoutiqueContextService } from '../context/boutique.context.service(1)';

// Interface pour un ticket
export interface Ticket {
  _id: string;
  boutique: string | any; // string si non peuplé, object si peuplé
  sujet: string;
  description: string;
  statut: 'OUVERT' | 'EN_COURS' | 'RESOLU';
  priorite: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENT';
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Interface pour la création d'un ticket
export interface CreateTicketData {
  sujet: string;
  description: string;
  priorite?: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENT';
}

// Interface pour les filtres de tickets
export interface TicketFilters {
  statut?: 'OUVERT' | 'EN_COURS' | 'RESOLU';
  priorite?: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENT';
  page?: number;
  limit?: number;
  search?: string;
}

// Interface pour la réponse paginée
export interface TicketResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  totalPages: number;
}

// Interface pour les statistiques des tickets
export interface TicketStats {
  total: number;
  ouvert: number;
  enCours: number;
  resolu: number;
  urgent: number;
  hautPriorite: number;
}

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  // URL de base pour les tickets (correspond à votre préfixe)
  private apiUrl = `${environment.apiUrl}/ticket`;

  constructor(private http: HttpClient,private boutiqueContext: BoutiqueContextService) { }

  /**
   * Créer un nouveau ticket
   * POST /tickets
   */
  createTicket(data: CreateTicketData): Observable<Ticket> {
    const boutique = this.boutiqueContext.getBoutiqueSelectionnee();

    if (!boutique?._id) {
      throw new Error('Aucune boutique sélectionnée');
    }
    let params = new HttpParams().set('boutiqueId', boutique._id);
    return this.http.post<Ticket>(this.apiUrl, data, { params }).pipe(catchError((error) => {
      console.error('Erreur création ticket:', error);
      throw error;
    }));
  }

  /**
   * Récupérer la liste des tickets avec filtres optionnels
   * GET /tickets
   */
  getTickets(filters?: TicketFilters): Observable<Ticket[]> {
    let params = new HttpParams().set('boutiqueId', this.boutiqueContext.getBoutiqueSelectionnee()?._id || '');
    
    if (filters) {
      if (filters.statut) params = params.set('statut', filters.statut);
      if (filters.priorite) params = params.set('priorite', filters.priorite);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
      if (filters.search) params = params.set('search', filters.search);
    }

    return this.http.get<Ticket[]>(this.apiUrl, { params });
  }

  /**
   * Récupérer la liste des tickets avec pagination
   * GET /tickets?page=1&limit=10
   */
  getTicketsPaginated(filters?: TicketFilters): Observable<TicketResponse> {
    let params = new HttpParams().set('boutiqueId', this.boutiqueContext.getBoutiqueSelectionnee()?._id || '');
    
    if (filters) {
      if (filters.statut) params = params.set('statut', filters.statut);
      if (filters.priorite) params = params.set('priorite', filters.priorite);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.limit) params = params.set('limit', filters.limit.toString());
      if (filters.search) params = params.set('search', filters.search);
    }

    return this.http.get<TicketResponse>(`${this.apiUrl}/paginated`, { params });
  }

  /**
   * Récupérer un ticket par son ID
   * GET /tickets/:id
   */
  getTicketById(id: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.apiUrl}/${id}`);
  }

  /**
   * Mettre à jour le statut d'un ticket
   * PATCH /tickets/:id/statut
   */
  updateTicketStatus(id: string, statut: 'OUVERT' | 'EN_COURS' | 'RESOLU'): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.apiUrl}/${id}/statut`, { statut });
  }

  /**
   * Mettre à jour la priorité d'un ticket
   * PATCH /tickets/:id/priorite
   */
  updateTicketPriority(id: string, priorite: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENT'): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.apiUrl}/${id}/priorite`, { priorite });
  }

  /**
   * Résoudre un ticket
   * POST /tickets/:id/resoudre
   */
  resolveTicket(id: string): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.apiUrl}/${id}/resoudre`, {});
  }

  /**
   * Rouvrir un ticket résolu
   * POST /tickets/:id/rouvrir
   */
  reopenTicket(id: string): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.apiUrl}/${id}/rouvrir`, {});
  }

  /**
   * Supprimer un ticket (si autorisé)
   * DELETE /tickets/:id
   */
  deleteTicket(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * Obtenir les statistiques des tickets
   * GET /tickets/stats
   */
  getTicketStats(): Observable<TicketStats> {
    const params = new HttpParams().set('boutiqueId', this.boutiqueContext.getBoutiqueSelectionnee()?._id || '');
    if (!params.get('boutiqueId')) {
      throw new Error('Aucune boutique sélectionnée');
    }

    return this.http.get<TicketStats>(`${this.apiUrl}/stats`, { params });
  }

  /**
   * Rechercher des tickets par mot-clé
   * GET /tickets/search?q=mot
   */
  searchTickets(query: string): Observable<Ticket[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<Ticket[]>(`${this.apiUrl}/search`, { params });
  }

  /**
   * Obtenir les tickets par priorité
   * GET /tickets/priorite/:priorite
   */
  getTicketsByPriority(priorite: string): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/priorite/${priorite}`);
  }

  /**
   * Obtenir les tickets par statut
   * GET /tickets/statut/:statut
   */
  getTicketsByStatus(statut: string): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/statut/${statut}`);
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Obtenir la classe CSS pour le badge de statut
   */
  getStatusBadgeClass(statut: string): string {
    const classes: { [key: string]: string } = {
      'OUVERT': 'bg-warning text-dark',
      'EN_COURS': 'bg-info text-white',
      'RESOLU': 'bg-success text-white'
    };
    return classes[statut] || 'bg-secondary text-white';
  }

  /**
   * Obtenir la classe CSS pour le badge de priorité
   */
  getPriorityBadgeClass(priorite: string): string {
    const classes: { [key: string]: string } = {
      'BASSE': 'bg-secondary text-white',
      'MOYENNE': 'bg-info text-white',
      'HAUTE': 'bg-warning text-dark',
      'URGENT': 'bg-danger text-white'
    };
    return classes[priorite] || 'bg-secondary text-white';
  }

  /**
   * Obtenir le libellé du statut en français
   */
  getStatusLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'OUVERT': 'Ouvert',
      'EN_COURS': 'En cours',
      'RESOLU': 'Résolu'
    };
    return labels[statut] || statut;
  }

  /**
   * Obtenir le libellé de la priorité en français
   */
  getPriorityLabel(priorite: string): string {
    const labels: { [key: string]: string } = {
      'BASSE': 'Basse',
      'MOYENNE': 'Moyenne',
      'HAUTE': 'Haute',
      'URGENT': 'Urgent'
    };
    return labels[priorite] || priorite;
  }

  /**
   * Obtenir l'icône Font Awesome pour le statut
   */
  getStatusIcon(statut: string): string {
    const icons: { [key: string]: string } = {
      'OUVERT': 'fa-envelope-open',
      'EN_COURS': 'fa-spinner fa-spin',
      'RESOLU': 'fa-check-circle'
    };
    return icons[statut] || 'fa-question-circle';
  }

  /**
   * Obtenir l'icône Font Awesome pour la priorité
   */
  getPriorityIcon(priorite: string): string {
    const icons: { [key: string]: string } = {
      'BASSE': 'fa-arrow-down',
      'MOYENNE': 'fa-minus',
      'HAUTE': 'fa-arrow-up',
      'URGENT': 'fa-exclamation-triangle'
    };
    return icons[priorite] || 'fa-flag';
  }
}