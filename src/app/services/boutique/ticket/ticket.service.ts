// services/boutique/ticket/ticket.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, throwError , tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BoutiqueContextService } from '../context/boutique.context.service';

// ===== INTERFACES POUR LES COMMENTAIRES =====
export interface Commentaire {
  _id?: string;
  auteurType: 'user' | 'boutique' | 'systeme';
  auteur?: {
    _id: string;
    nom?: string;
    email?: string;
  } | string;
  auteurRef?: 'User' | 'Boutique';
  texte: string;
  date: Date;
  type?: 'commentaire' | 'resolution' | 'reouverture';
}

export interface AddCommentData {
  texte: string;
  auteurType?: 'user' | 'boutique' | 'systeme'; // Optionnel, défini par le backend selon le contexte
}

export interface CommentaireResponse {
  success: boolean;
  commentaires: Commentaire[];
  total: number;
}

// ===== INTERFACES POUR LES TICKETS =====
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
  commentaires?: Commentaire[]; // Ajout des commentaires dans le ticket
}

export interface CreateTicketData {
  sujet: string;
  description: string;
  priorite?: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENT';
}

export interface TicketFilters {
  statut?: 'OUVERT' | 'EN_COURS' | 'RESOLU';
  priorite?: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENT';
  page?: number;
  limit?: number;
  search?: string;
  boutiqueId?: string;
  dateDebut?: Date ;
  dateFin?: Date ;
  tri?: string;
}

export interface TicketResponse {
  tickets: Ticket[];
  total: number;
  page: number;
  totalPages: number;
}

export interface PaginatedTicketResponse {
  success: boolean;
  data: Ticket[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextPage: number | null;
    prevPage: number | null;
  };
  filters?: any;
  stats?: any;
}

export interface TicketStats {
  total: number;
  ouvert: number;
  enCours: number;
  resolu: number;
  urgent: number;
  hautPriorite: number;
  moyennePriorite?: number;
  bassePriorite?: number;
}

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private apiUrl = `${environment.apiUrl}/ticket`;

  constructor(
    private http: HttpClient,
    private boutiqueContext: BoutiqueContextService
  ) { }

  // ===== MÉTHODES POUR LES BOUTIQUES =====
  updatePriorityFromString(ticket: Ticket, priority: string): void {
  const validPriorities = ['BASSE', 'MOYENNE', 'HAUTE', 'URGENT'];
  console.log('🔄 Mise à jour priorité:', priority);
  
  if (!validPriorities.includes(priority)) {
    console.warn('❌ Priorité invalide:', priority);
    return;
  }

  // 👇 IMPORTANT: Il faut souscrire pour que la requête soit envoyée
  this.updateTicketPriority(ticket._id, priority as 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENT')
    .subscribe({
      next: (updatedTicket) => {
        console.log('✅ Réponse reçue - Ticket mis à jour:', updatedTicket);
        
        // Mettre à jour le ticket local avec les données du serveur
        ticket.priorite = updatedTicket.priorite;
        ticket.updatedAt = updatedTicket.updatedAt;
        
        console.log('🎯 Nouvelle priorité après mise à jour:', ticket.priorite);
      },
      error: (error) => {
        console.error('❌ Erreur lors de la mise à jour:', error);
      }
    });
}
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
    return this.http.post<Ticket>(this.apiUrl, data, { params }).pipe(
      catchError(this.handleError)
    );
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

    return this.http.get<Ticket[]>(this.apiUrl, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer la liste des tickets avec pagination
   * GET /tickets/paginated
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

    return this.http.get<TicketResponse>(`${this.apiUrl}/paginated`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer un ticket par son ID
   * GET /tickets/:id
   */
  getTicketById(id: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Mettre à jour le statut d'un ticket
   * PATCH /tickets/:id/statut
   */
  updateTicketStatus(id: string, statut: 'OUVERT' | 'EN_COURS' | 'RESOLU'): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.apiUrl}/${id}/status`, { statut }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Mettre à jour la priorité d'un ticket
   * PATCH /tickets/:id/priorite
   */
  /**
 * Mettre à jour la priorité d'un ticket
 * PATCH /tickets/:id/priorite
 */
updateTicketPriority(id: string, priorite: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENT'): Observable<Ticket> {
  console.log('📤 Envoi requête update priority:', { id, priorite });
  
  return this.http.patch<Ticket>(`${this.apiUrl}/${id}/priorite`, { priorite }).pipe(
    tap({
      next: (response : any) => console.log('📥 Réception réponse:', response),
      error: (error : any) => console.error('❌ Erreur HTTP:', error)
    }),
    catchError(this.handleError)
  );
}
  /**
   * Résoudre un ticket
   * POST /tickets/:id/resoudre
   */
  resolveTicket(id: string): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.apiUrl}/${id}/resoudre`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Rouvrir un ticket résolu
   * POST /tickets/:id/rouvrir
   */
  reopenTicket(id: string): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.apiUrl}/${id}/rouvrir`, {}).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Supprimer un ticket
   * DELETE /tickets/:id
   */
  deleteTicket(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtenir les statistiques des tickets
   * GET /tickets/stats
   */
  getTicketStats(): Observable<TicketStats> {
    const params = new HttpParams().set('boutiqueId', this.boutiqueContext.getBoutiqueSelectionnee()?._id || '');
    return this.http.get<TicketStats>(`${this.apiUrl}/stats`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Rechercher des tickets par mot-clé
   * GET /tickets/search?q=mot
   */
  searchTickets(query: string): Observable<Ticket[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<Ticket[]>(`${this.apiUrl}/search`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtenir les tickets par priorité
   * GET /tickets/priorite/:priorite
   */
  getTicketsByPriority(priorite: string): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/priorite/${priorite}`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Obtenir les tickets par statut
   * GET /tickets/statut/:statut
   */
  getTicketsByStatus(statut: string): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.apiUrl}/statut/${statut}`).pipe(
      catchError(this.handleError)
    );
  }

  // ===== MÉTHODES POUR LES COMMENTAIRES =====

  /**
   * Ajouter un commentaire à un ticket
   * POST /tickets/:id/commentaires
   */
  addComment(id: string, data: AddCommentData): Observable<any> {
    const boutique = this.boutiqueContext.getBoutiqueSelectionnee();
    let params = new HttpParams();
    
    // Si c'est une boutique qui commente, on ajoute boutiqueId dans la query
    if (boutique?._id) {
      params = params.set('boutiqueId', boutique._id);
    }

    return this.http.post(`${this.apiUrl}/${id}/commentaires`, data, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer tous les commentaires d'un ticket
   * GET /tickets/:id/commentaires
   */
  getCommentaires(id: string): Observable<CommentaireResponse> {
    const boutique = this.boutiqueContext.getBoutiqueSelectionnee();
    let params = new HttpParams();
    
    if (boutique?._id) {
      params = params.set('boutiqueId', boutique._id);
    }

    return this.http.get<CommentaireResponse>(`${this.apiUrl}/${id}/commentaires`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Supprimer un commentaire (admin uniquement)
   * DELETE /tickets/:ticketId/commentaires/:commentaireId
   */
  deleteCommentaire(ticketId: string, commentaireId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${ticketId}/commentaires/${commentaireId}`).pipe(
      catchError(this.handleError)
    );
  }

  // ===== MÉTHODES POUR L'ADMIN =====

  /**
   * Récupérer tous les tickets (admin) avec pagination
   * GET /tickets/all
   */
 getAllTickets(filters?: TicketFilters): Observable<PaginatedTicketResponse> {
  let params = new HttpParams();
  
  if (filters) {
    if (filters.statut) params = params.set('statut', filters.statut);
    if (filters.priorite) params = params.set('priorite', filters.priorite);
    if (filters.boutiqueId) params = params.set('boutiqueId', filters.boutiqueId);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.search) params = params.set('search', filters.search);
    
    // CORRECTION: Vérifier le type avant d'appeler toISOString()
    if (filters.dateDebut) {
      console.log('📅 dateDebut avant conversion:', filters.dateDebut);
        params = params.set('dateDebut', (filters.dateDebut as any).toString());
      
    }
    
    if (filters.dateFin) {
        params = params.set('dateFin', (filters.dateFin as any).toString());
      } 
       if (filters.tri) params = params.set('tri', filters.tri);
  }

  return this.http.get<PaginatedTicketResponse>(`${this.apiUrl}/all`, { params }).pipe(
    catchError(this.handleError)
  );
}
  /**
   * Récupérer les statistiques globales des tickets (admin)
   * GET /tickets/admin/stats
   */
  getAdminStats(filters?: { dateDebut?: Date; dateFin?: Date }): Observable<any> {
    let params = new HttpParams();
    
    if (filters?.dateDebut) params = params.set('dateDebut', (filters.dateDebut as any).toString());
    if (filters?.dateFin) params = params.set('dateFin', (filters.dateFin as any).toString());
    console.log('📊 Récupération stats admin avec params:', params.toString());
    return this.http.get(`${this.apiUrl}/admin/stats`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Assigner un ticket à un admin
   * PATCH /tickets/:id/assigner
   */
  assignTicket(id: string, adminId: string): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.apiUrl}/${id}/assigner`, { adminId }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Exporter les tickets (CSV/Excel)
   * GET /tickets/export
   */
  exportTickets(format: 'csv' | 'excel' = 'csv', filters?: TicketFilters): Observable<Blob> {
    let params = new HttpParams().set('format', format);
    
    if (filters) {
      if (filters.statut) params = params.set('statut', filters.statut);
      if (filters.priorite) params = params.set('priorite', filters.priorite);
      if (filters.boutiqueId) params = params.set('boutiqueId', filters.boutiqueId);
      if (filters.dateDebut) params = params.set('dateDebut', filters.dateDebut.toISOString());
      if (filters.dateFin) params = params.set('dateFin', filters.dateFin.toISOString());
    }

    return this.http.get(`${this.apiUrl}/export`, { 
      params, 
      responseType: 'blob' 
    }).pipe(catchError(this.handleError));
  }

  // ===== GESTION DES ERREURS =====

  private handleError(error: any): Observable<never> {
    console.error('❌ Erreur TicketService:', error);
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // ===== MÉTHODES UTILITAIRES =====

  getStatusBadgeClass(statut: string): string {
    const classes: { [key: string]: string } = {
      'OUVERT': 'bg-warning text-dark',
      'EN_COURS': 'bg-info text-white',
      'RESOLU': 'bg-success text-white'
    };
    return classes[statut] || 'bg-secondary text-white';
  }

  getPriorityBadgeClass(priorite: string): string {
    const classes: { [key: string]: string } = {
      'BASSE': 'bg-secondary text-white',
      'MOYENNE': 'bg-info text-white',
      'HAUTE': 'bg-warning text-dark',
      'URGENT': 'bg-danger text-white'
    };
    return classes[priorite] || 'bg-secondary text-white';
  }

  getStatusLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'OUVERT': 'Ouvert',
      'EN_COURS': 'En cours',
      'RESOLU': 'Résolu'
    };
    return labels[statut] || statut;
  }

  getPriorityLabel(priorite: string): string {
    const labels: { [key: string]: string } = {
      'BASSE': 'Basse',
      'MOYENNE': 'Moyenne',
      'HAUTE': 'Haute',
      'URGENT': 'Urgent'
    };
    return labels[priorite] || priorite;
  }

  getStatusIcon(statut: string): string {
    const icons: { [key: string]: string } = {
      'OUVERT': 'fa-envelope-open',
      'EN_COURS': 'fa-spinner fa-spin',
      'RESOLU': 'fa-check-circle'
    };
    return icons[statut] || 'fa-question-circle';
  }

  getPriorityIcon(priorite: string): string {
    const icons: { [key: string]: string } = {
      'BASSE': 'fa-arrow-down',
      'MOYENNE': 'fa-minus',
      'HAUTE': 'fa-arrow-up',
      'URGENT': 'fa-exclamation-triangle'
    };
    return icons[priorite] || 'fa-flag';
  }

  /**
   * Obtenir le libellé du type d'auteur
   */
  getAuteurTypeLabel(auteurType: string): string {
    const labels: { [key: string]: string } = {
      'boutique': 'Ma boutique',
      'user': 'Support',
      'systeme': 'Système'
    };
    return labels[auteurType] || auteurType;
  }

  /**
   * Obtenir l'avatar/icône pour le type d'auteur
   */
  getAuteurTypeIcon(auteurType: string): string {
    const icons: { [key: string]: string } = {
      'boutique': 'fa-store',
      'user': 'fa-user-headset',
      'systeme': 'fa-robot'
    };
    return icons[auteurType] || 'fa-user';
  }

  /**
   * Obtenir la classe CSS pour le type d'auteur
   */
  getAuteurTypeClass(auteurType: string): string {
    const classes: { [key: string]: string } = {
      'boutique': 'boutique-comment',
      'user': 'support-comment',
      'systeme': 'system-comment'
    };
    return classes[auteurType] || '';
  }
}