import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { NgbModal, NgbModule, NgbPaginationModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { TicketComponent }  from '../../boutique/ticket/ticket.component';
import { TicketService, Ticket, TicketFilters, PaginatedTicketResponse, Commentaire } from '../../../services/boutique/ticket/ticket.service';
import { ToastService } from '../../../services/utils/toast/toast.service';

@Component({
  selector: 'app-ticket-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgbModule,
    NgbPaginationModule,
    NgbDropdownModule
  ],
  templateUrl: './ticket-management.component.html',
  styleUrls: ['./ticket-management.component.css']
})
export class TicketManagementComponent implements OnInit, OnDestroy {
  // ===== ÉTATS =====
  loading = false;
  loadingComments = false;
  processingTicketId: string | null = null;
  selectedTicket: Ticket | null = null;
  
  // ===== DONNÉES =====
  tickets: Ticket[] = [];
  commentaires: Commentaire[] = [];
  stats: any = {
    total: 0,
    ouvert: 0,
    enCours: 0,
    resolu: 0,
    urgent: 0,
    hautPriorite: 0,
    moyennePriorite: 0,
    bassePriorite: 0
  };
  
  // ===== FILTRES =====
  filters: TicketFilters = {
    statut: undefined,
    priorite: undefined,
    boutiqueId: undefined,
    search: '',
    page: 1,
    limit: 10,
    dateDebut: undefined,
    dateFin: undefined,
    tri: '-createdAt'
  };
  
  // ===== PAGINATION =====
  pagination = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false
  };
  
  // ===== OPTIONS POUR LES SELECTS =====
  statuts = ['OUVERT', 'EN_COURS', 'RESOLU'];
  priorites = ['BASSE', 'MOYENNE', 'HAUTE', 'URGENT'];
  boutiques: Array<{ _id: string, nom: string }> = [];
  
  // ===== FORMULAIRES =====
  commentForm: FormGroup;
  filterForm: FormGroup;
  
  // ===== MODALS =====
  @ViewChild('ticketDetailsModal') ticketDetailsModal: any;
  @ViewChild('commentModal') commentModal: any;
  @ViewChild('resolveModal') resolveModal: any;
  @ViewChild('deleteConfirmModal') deleteConfirmModal: any;
  
  // ===== SUBSCRIPTIONS =====
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  
  // Math pour le template
  Math = Math;

  constructor(
    private ticketService: TicketService,
    private toastService: ToastService,
    private modalService: NgbModal, // Pour les méthodes liées à la boutique
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    this.commentForm = this.fb.group({
      texte: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(500)]]
    });
    
    this.filterForm = this.fb.group({
      statut: [''],
      priorite: [''],
      boutiqueId: [''],
      dateDebut: [''],
      dateFin: [''],
      search: ['']
    });
  }

  ngOnInit(): void {
    this.loadTickets();
    this.loadStats();
    this.loadBoutiques();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== INITIALISATION =====

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(searchTerm => {
      this.filters.search = searchTerm;
      this.filters.page = 1;
      this.loadTickets();
      this.cdr.markForCheck();
    });
  }

  loadBoutiques(): void {
    // À implémenter selon votre service de boutiques
    // this.boutiqueService.getAllBoutiques().subscribe(...)
  }

  // ===== CHARGEMENT DES DONNÉES =====

  loadTickets(): void {
    this.loading = true;
    
    this.ticketService.getAllTickets(this.filters).subscribe({
      next: (response: PaginatedTicketResponse) => {
        console.log('📋 Filtres appliqués:', this.filters);
        this.tickets = response.data;
        this.pagination = response.pagination;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('❌ Erreur chargement tickets:', error);
        this.toastService.show('Erreur lors du chargement des tickets', 'error');
        this.loading = false;
      }
    });
  }

  loadStats(): void {
    this.ticketService.getAdminStats({
      dateDebut: this.filters.dateDebut,
      dateFin: this.filters.dateFin
    }).subscribe({
      next: (stats) => {
        this.stats = stats;
        this.cdr.markForCheck();
      },
      error: (error) => console.error('❌ Erreur chargement stats:', error)
    });
  }

  loadCommentaires(ticketId: string): void {
    this.loadingComments = true;
    this.ticketService.getCommentaires(ticketId).subscribe({
      next: (response) => {
        this.commentaires = response.commentaires;
        this.loadingComments = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('❌ Erreur chargement commentaires:', error);
        this.toastService.show('Erreur lors du chargement des commentaires', 'error');
        this.loadingComments = false;
      }
    });
  }

  // ===== GESTION DES FILTRES =====

  applyFilters(): void {
    this.filters = {
      ...this.filters,
      ...this.filterForm.value,
      page: 1
    };
    this.loadTickets();
    this.loadStats();
    this.cdr.markForCheck();
  }

  resetFilters(): void {
    this.filterForm.reset({
      statut: '',
      priorite: '',
      boutiqueId: '',
      dateDebut: '',
      dateFin: '',
      search: ''
    });
    
    this.filters = {
      statut: undefined,
      priorite: undefined,
      boutiqueId: undefined,
      search: '',
      page: 1,
      limit: 10,
      dateDebut: undefined,
      dateFin: undefined,
      tri: '-createdAt'
    };
    
    this.loadTickets();
    this.loadStats();
    this.cdr.markForCheck();
  }

  onSearch(event: any): void {
    this.searchSubject.next(event.target.value);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages) {
      this.filters.page = page;
      this.loadTickets();
    }
  }

  // ===== GESTION DES TICKETS =====

  viewTicketDetails(ticket: Ticket): void {
    this.selectedTicket = ticket;
    this.loadCommentaires(ticket._id);
    this.modalService.open(this.ticketDetailsModal, {
      size: 'lg',
      centered: true,
      scrollable: true
    });
  }

  updateStatus(ticket: Ticket, newStatus: 'OUVERT' | 'EN_COURS' | 'RESOLU'): void {
    this.processingTicketId = ticket._id;
    
    const statusMessages = {
      'OUVERT': 'Ticket réouvert',
      'EN_COURS': 'Ticket pris en charge',
      'RESOLU': 'Ticket résolu'
    };

    this.ticketService.updateTicketStatus(ticket._id, newStatus).subscribe({
      next: (updatedTicket) => {
        // Mettre à jour le ticket dans la liste
        const index = this.tickets.findIndex(t => t._id === ticket._id);
        if (index !== -1) {
          this.tickets[index] = updatedTicket;
        }
        
        // Ajouter un commentaire automatique
        this.addSystemComment(ticket._id, statusMessages[newStatus]);
        
        this.processingTicketId = null;
        this.toastService.show(`Statut mis à jour: ${this.ticketService.getStatusLabel(newStatus)}`, 'success');
        this.loadStats();
      },
      error: (error) => {
        console.error('❌ Erreur mise à jour statut:', error);
        this.toastService.show('Erreur lors de la mise à jour du statut', 'error');
        this.processingTicketId = null;
      }
    });
  }

  updatePriority(ticket: Ticket, newPriority: string): void {
    console.log('Mise à jour priorité:', newPriority);
    this.ticketService.updatePriorityFromString(ticket, newPriority);
    console.log('Ticket après mise à jour priorité:', ticket);
    this.cdr.markForCheck();
  }

  openResolveModal(ticket: Ticket): void {
    this.selectedTicket = ticket;
    this.commentForm.reset();
    this.modalService.open(this.resolveModal, {
      size: 'md',
      centered: true
    });
  }

  resolveTicketWithComment(): void {
    if (!this.selectedTicket || this.commentForm.invalid) return;
    
    this.processingTicketId = this.selectedTicket._id;
    const comment = this.commentForm.get('texte')?.value;
    
    this.ticketService.updateTicketStatus(this.selectedTicket._id, 'RESOLU').subscribe({
      next: (updatedTicket) => {
        // Mettre à jour le ticket
        const index = this.tickets.findIndex(t => t._id === this.selectedTicket!._id);
        if (index !== -1) {
          this.tickets[index] = updatedTicket;
        }
        
        // Ajouter le commentaire de résolution
        if (comment) {
          this.addSystemComment(this.selectedTicket!._id, `✅ Résolution: ${comment}`);
        } else {
          this.addSystemComment(this.selectedTicket!._id, '✅ Ticket résolu');
        }
        
        this.modalService.dismissAll();
        this.processingTicketId = null;
        this.toastService.show('Ticket résolu avec succès', 'success');
        this.loadStats();
      },
      error: (error) => {
        console.error('❌ Erreur résolution ticket:', error);
        this.toastService.show('Erreur lors de la résolution du ticket', 'error');
        this.processingTicketId = null;
      }
    });
  }

  reopenTicket(ticket: Ticket): void {
    this.processingTicketId = ticket._id;
    
    this.ticketService.reopenTicket(ticket._id).subscribe({
      next: (updatedTicket) => {
        const index = this.tickets.findIndex(t => t._id === ticket._id);
        if (index !== -1) {
          this.tickets[index] = updatedTicket;
        }
        
        this.addSystemComment(ticket._id, '🔄 Ticket réouvert');
        
        this.processingTicketId = null;
        this.toastService.show('Ticket réouvert avec succès', 'success');
        this.loadStats();
      },
      error: (error) => {
        console.error('❌ Erreur réouverture ticket:', error);
        this.toastService.show('Erreur lors de la réouverture du ticket', 'error');
        this.processingTicketId = null;
      }
    });
  }

  // ===== GESTION DES COMMENTAIRES =====

  openCommentModal(ticket: Ticket): void {
    this.selectedTicket = ticket;
    this.commentForm.reset();
    this.modalService.open(this.commentModal, {
      size: 'md',
      centered: true
    });
  }

  addComment(): void {
    if (!this.selectedTicket || this.commentForm.invalid) return;
    
    const commentData = {
      texte: this.commentForm.get('texte')?.value
      // auteurType sera 'user' car c'est un admin qui commente
    };

    this.ticketService.addComment(this.selectedTicket._id, commentData).subscribe({
      next: (response) => {
        this.toastService.show('Commentaire ajouté avec succès', 'success');
        this.modalService.dismissAll();
        
        // Recharger les commentaires si le modal de détails est ouvert
        if (this.selectedTicket) {
          this.loadCommentaires(this.selectedTicket._id);
        }
        
        this.commentForm.reset();
      },
      error: (error) => {
        console.error('❌ Erreur ajout commentaire:', error);
        this.toastService.show('Erreur lors de l\'ajout du commentaire', 'error');
      }
    });
  }

  private addSystemComment(ticketId: string, message: string): void {
    this.ticketService.addComment(ticketId, { 
      texte: `⚙️ ${message}` 
    }).subscribe({
      error: (error) => console.error('❌ Erreur ajout commentaire système:', error)
    });
  }

  deleteComment(ticketId: string, commentaireId: string): void {
    if (confirm('Supprimer ce commentaire ?')) {
      this.ticketService.deleteCommentaire(ticketId, commentaireId).subscribe({
        next: () => {
          this.toastService.show('Commentaire supprimé', 'success');
          if (this.selectedTicket?._id === ticketId) {
            this.loadCommentaires(ticketId);
          }
        },
        error: (error) => {
          console.error('❌ Erreur suppression commentaire:', error);
          this.toastService.show('Erreur lors de la suppression', 'error');
        }
      });
    }
  }

  // ===== SUPPRESSION DE TICKET =====

  openDeleteModal(ticket: Ticket): void {
    this.selectedTicket = ticket;
    this.modalService.open(this.deleteConfirmModal, {
      size: 'md',
      centered: true
    });
  }

  deleteTicket(): void {
    if (!this.selectedTicket) return;
    
    this.processingTicketId = this.selectedTicket._id;
    
    this.ticketService.deleteTicket(this.selectedTicket._id).subscribe({
      next: () => {
        this.tickets = this.tickets.filter(t => t._id !== this.selectedTicket!._id);
        this.modalService.dismissAll();
        this.processingTicketId = null;
        this.toastService.show('Ticket supprimé avec succès', 'success');
        this.loadStats();
      },
      error: (error) => {
        console.error('❌ Erreur suppression ticket:', error);
        this.toastService.show('Erreur lors de la suppression', 'error');
        this.processingTicketId = null;
      }
    });
  }

  // ===== EXPORT =====

  exportTickets(format: 'csv' | 'excel' = 'csv'): void {
    this.ticketService.exportTickets(format, this.filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tickets_${new Date().toISOString().split('T')[0]}.${format}`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.toastService.show(`Export ${format.toUpperCase()} réussi`, 'success');
      },
      error: (error) => {
        console.error('❌ Erreur export:', error);
        this.toastService.show('Erreur lors de l\'export', 'error');
      }
    });
  }

  // ===== MÉTHODES POUR LES COMMENTAIRES =====

  getAuteurNom(commentaire: Commentaire): string {
    if (commentaire.auteurType === 'boutique') {
      return 'Boutique';
    } else if (commentaire.auteurType === 'systeme') {
      return 'Système';
    } else {
      return 'Admin';
    }
  }

  getAuteurAvatar(commentaire: Commentaire): string {
    if (commentaire.auteurType === 'boutique') {
      return '🏪';
    } else if (commentaire.auteurType === 'systeme') {
      return '⚙️';
    } else {
      return '👤';
    }
  }

  getAuteurClass(commentaire: Commentaire): string {
    switch(commentaire.auteurType) {
      case 'boutique': return 'boutique-comment';
      case 'systeme': return 'system-comment';
      default: return 'admin-comment';
    }
  }

  // ===== MÉTHODES UTILITAIRES =====

  getStatusBadgeClass(statut: string): string {
    return this.ticketService.getStatusBadgeClass(statut);
  }

  getPriorityBadgeClass(priorite: string): string {
    return this.ticketService.getPriorityBadgeClass(priorite);
  }

  getStatusLabel(statut: string): string {
    return this.ticketService.getStatusLabel(statut);
  }

  getPriorityLabel(priorite: string): string {
    return this.ticketService.getPriorityLabel(priorite);
  }

  getStatusIcon(statut: string): string {
    return this.ticketService.getStatusIcon(statut);
  }

  getPriorityIcon(priorite: string): string {
    return this.ticketService.getPriorityIcon(priorite);
  }

  getNomBoutique(ticket: Ticket): string {
    if (typeof ticket.boutique === 'object' && ticket.boutique?.nom) {
      return ticket.boutique.nom;
    }
    return 'Boutique inconnue';
  }

  getTimeSince(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}j`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}min`;
    return 'maintenant';
  }

  getPagesArray(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    let start = Math.max(1, this.pagination.currentPage - 2);
    let end = Math.min(this.pagination.totalPages, start + maxVisiblePages - 1);
    
    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  getDisplayStart(): number {
    return ((this.pagination.currentPage - 1) * this.pagination.itemsPerPage) + 1;
  }

  getDisplayEnd(): number {
    return Math.min(this.pagination.currentPage * this.pagination.itemsPerPage, this.pagination.totalItems);
  }
}