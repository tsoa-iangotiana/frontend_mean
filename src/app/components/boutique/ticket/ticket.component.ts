// components/boutique/tickets/tickets.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModal, NgbModule, NgbPaginationModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { TicketService, Ticket, TicketFilters, TicketStats, Commentaire, AddCommentData } from '../../../services/boutique/ticket/ticket.service';
import { AuthService } from '../../../services/auth';
import { ToastService } from '../../../services/utils/toast/toast.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    NgbModule,
    NgbPaginationModule,
    NgbDropdownModule
  ],
  templateUrl: './ticket.component.html',
  styleUrls: ['./ticket.component.css']
})
export class TicketComponent implements OnInit, OnDestroy {
  // ===== ÉTATS =====
  loading = false;
  loadingComments = false;
  selectedTicket: Ticket | null = null;
  ticketToReopen: Ticket | null = null;
  
  // ===== DONNÉES =====
  tickets: Ticket[] = [];
  ticketStats: TicketStats | null = null;
  commentaires: Commentaire[] = [];
  
  // ===== FILTRES =====
  filters: TicketFilters = {
    statut: undefined,
    priorite: undefined,
    page: 1,
    limit: 10
  };
  
  // ===== OPTIONS POUR LES SELECTS =====
  statuts = ['OUVERT', 'EN_COURS', 'RESOLU'];
  priorites = ['BASSE', 'MOYENNE', 'HAUTE', 'URGENT'];
  
  // ===== FORMULAIRES =====
  ticketForm: FormGroup;
  commentForm: FormGroup;
  
  // ===== SUBSCRIPTIONS =====
  private subscriptions: Subscription[] = [];
  private searchSubject = new Subject<string>();

  @ViewChild('createTicketModal') createTicketModal: any;
  @ViewChild('ticketDetailsModal') ticketDetailsModal: any;
  @ViewChild('commentModal') commentModal: any;
  @ViewChild('reopenCommentModal') reopenCommentModal: any;

  constructor(
    private fb: FormBuilder,
    private ticketService: TicketService,
    private authService: AuthService,
    private modalService: NgbModal,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    this.ticketForm = this.createForm();
    this.commentForm = this.createCommentForm();
  }

  ngOnInit(): void {
    if (!this.authService.isBrowser()) {
      return;
    }
    
    this.initializeAuth();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private async initializeAuth(): Promise<void> {
    await this.authService.initializeAuth();
    
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.loadTickets();
    this.loadStats();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      sujet: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
      priorite: ['MOYENNE', Validators.required]
    });
  }

  private createCommentForm(): FormGroup {
    return this.fb.group({
      texte: ['', [Validators.maxLength(500)]] // Sans required pour que ce soit optionnel
    });
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(searchTerm => {
      if (searchTerm.length >= 3) {
        this.ticketService.searchTickets(searchTerm).subscribe({
          next: (tickets) => {
            this.tickets = tickets;
            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('❌ Erreur recherche:', error);
            this.toastService.show('Erreur lors de la recherche', 'error');
          }
        });
      } else if (searchTerm.length === 0) {
        this.loadTickets();
      }
    });
  }

  // ===== CHARGEMENT DES DONNÉES =====
  loadTickets(): void {
    this.loading = true;
    this.cdr.detectChanges();

    this.ticketService.getTickets(this.filters).subscribe({
      next: (tickets) => {
        this.tickets = tickets;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur chargement tickets:', error);
        this.toastService.show('Erreur lors du chargement des tickets', 'error');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadStats(): void {
    this.ticketService.getTicketStats().subscribe({
      next: (stats) => {
        this.ticketStats = stats;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur chargement stats:', error);
      }
    });
  }

  loadCommentaires(ticketId: string): void {
    this.loadingComments = true;
    this.ticketService.getCommentaires(ticketId).subscribe({
      next: (response) => {
        this.commentaires = response.commentaires;
        this.loadingComments = false;
        this.cdr.detectChanges();
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
    this.filters.page = 1;
    this.loadTickets();
  }

  resetFilters(): void {
    this.filters = {
      statut: undefined,
      priorite: undefined,
      page: 1,
      limit: 10
    };
    this.loadTickets();
  }

  onSearch(event: any): void {
    const searchTerm = event.target.value;
    this.searchSubject.next(searchTerm);
  }

  // ===== GESTION DES TICKETS =====
  openCreateModal(): void {
    this.ticketForm.reset({ priorite: 'MOYENNE' });
    this.modalService.open(this.createTicketModal, {
      size: 'lg',
      backdrop: 'static',
      centered: true
    });
  }

  createTicket(): void {
    if (this.ticketForm.invalid) {
      this.markFormGroupTouched(this.ticketForm);
      this.toastService.show('Veuillez remplir tous les champs requis', 'warning');
      return;
    }

    this.loading = true;
    const formValue = this.ticketForm.value;

    this.ticketService.createTicket(formValue).subscribe({
      next: (ticket) => {
        this.toastService.show('Ticket créé avec succès', 'success');
        this.modalService.dismissAll();
        this.ticketForm.reset({ priorite: 'MOYENNE' });
        this.loadTickets();
        this.loadStats();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur création ticket:', error);
        this.toastService.show(error.error?.message || 'Erreur lors de la création', 'error');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewTicketDetails(ticket: Ticket): void {
    this.selectedTicket = ticket;
    this.loadCommentaires(ticket._id);
    this.modalService.open(this.ticketDetailsModal, {
      size: 'lg',
      centered: true,
      scrollable: true
    });
  }

  // ===== GESTION DE LA RÉOUVERTURE AVEC COMMENTAIRE =====
  openReopenModal(ticket: Ticket): void {
    this.ticketToReopen = ticket;
    this.commentForm.reset();
    this.modalService.open(this.reopenCommentModal, {
      size: 'md',
      centered: true
    });
  }

  // Méthode pour rouvrir avec commentaire (la boutique commente)
reopenTicketWithComment(): void {
  if (!this.ticketToReopen) return;
  
  const comment = this.commentForm.get('texte')?.value;
  
  this.ticketService.updateTicketStatus(this.ticketToReopen._id, 'OUVERT').subscribe({
    next: (updatedTicket) => {
      // Mettre à jour le ticket dans la liste
      const index = this.tickets.findIndex(t => t._id === this.ticketToReopen!._id);
      if (index !== -1) {
        this.tickets[index] = updatedTicket;
      }
      
      // Mettre à jour le ticket sélectionné si c'est le même
      if (this.selectedTicket?._id === this.ticketToReopen!._id) {
        this.selectedTicket = updatedTicket;
      }
      
      // Ajouter le commentaire de réouverture - utilisant addComment (boutique)
      if (comment && comment.trim()) {
        const commentData: AddCommentData = {
          texte: `🔄 Réouverture: ${comment}`,
          auteurType: 'boutique'  // Important : c'est la boutique qui commente
        };
        this.ticketService.addComment(this.ticketToReopen!._id, commentData).subscribe();
      } else {
        const commentData: AddCommentData = {
          texte: '🔄 Ticket réouvert',
          auteurType: 'boutique'  // Important : c'est la boutique qui commente
        };
        this.ticketService.addComment(this.ticketToReopen!._id, commentData).subscribe();
      }
      
      this.modalService.dismissAll();
      this.toastService.show('Ticket réouvert avec succès', 'success');
      this.loadStats();
      this.ticketToReopen = null;
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('❌ Erreur réouverture ticket:', error);
      this.toastService.show('Erreur lors de la réouverture du ticket', 'error');
      this.ticketToReopen = null;
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
    if (this.commentForm.invalid || !this.selectedTicket) {
      this.toastService.show('Veuillez entrer un commentaire', 'warning');
      return;
    }

    const commentData: AddCommentData = {
      texte: this.commentForm.get('texte')?.value,
      auteurType: 'boutique'
    };

    this.ticketService.addComment(this.selectedTicket._id, commentData).subscribe({
      next: (response) => {
        this.toastService.show('Commentaire ajouté avec succès', 'success');
        this.modalService.dismissAll();
        
        if (this.selectedTicket) {
          this.loadCommentaires(this.selectedTicket._id);
        }
        
        this.loadTickets();
        this.loadStats();
        this.commentForm.reset();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur ajout commentaire:', error);
        this.toastService.show(error.error?.message || 'Erreur lors de l\'ajout du commentaire', 'error');
      }
    });
  }

  private addSystemComment(ticket: Ticket, message: string): void {
    this.ticketService.addComment(ticket._id, { 
      texte: message,
      auteurType: 'systeme'
    }).subscribe();
  }

  // ===== GESTION DES STATUTS =====
  updateStatus(ticket: Ticket, newStatus: 'OUVERT' | 'EN_COURS' | 'RESOLU'): void {
    const statusLabels = {
      'OUVERT': 'Ouvert',
      'EN_COURS': 'En cours',
      'RESOLU': 'Résolu'
    };

    this.ticketService.updateTicketStatus(ticket._id, newStatus).subscribe({
      next: (updated) => {
        this.toastService.show(`Statut mis à jour: ${statusLabels[newStatus]}`, 'success');
        this.loadTickets();
        this.loadStats();
        
        if (newStatus === 'EN_COURS') {
          this.addSystemComment(ticket, '🔧 Ticket pris en charge');
        } else if (newStatus === 'RESOLU') {
          this.addSystemComment(ticket, '✅ Ticket résolu');
        }
        
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur mise à jour statut:', error);
        this.toastService.show('Erreur lors de la mise à jour du statut', 'error');
      }
    });
  }

  // ===== GESTION DES PRIORITÉS =====
  updatePriorityFromString(ticket: Ticket, priority: string): void {
    this.ticketService.updatePriorityFromString(ticket, priority);
    this.cdr.markForCheck();
  }

  updatePriority(ticket: Ticket, newPriority: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENT'): void {
    this.ticketService.updateTicketPriority(ticket._id, newPriority).subscribe({
      next: (updated) => {
        this.toastService.show(`Priorité mise à jour: ${this.getPriorityLabel(newPriority)}`, 'success');
        this.loadTickets();
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('❌ Erreur mise à jour priorité:', error);
        this.toastService.show('Erreur lors de la mise à jour de la priorité', 'error');
      }
    });
  }

  // ===== SUPPRESSION =====
  deleteTicket(ticket: Ticket): void {
    if (confirm(`⚠️ Êtes-vous sûr de vouloir supprimer le ticket "${ticket.sujet}" ?\nCette action est irréversible.`)) {
      this.ticketService.deleteTicket(ticket._id).subscribe({
        next: () => {
          this.toastService.show('Ticket supprimé avec succès', 'success');
          this.loadTickets();
          this.loadStats();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Erreur suppression ticket:', error);
          this.toastService.show('Erreur lors de la suppression du ticket', 'error');
        }
      });
    }
  }

  // ===== MÉTHODES POUR LES COMMENTAIRES =====
  getAuteurNom(commentaire: Commentaire): string {
    if (commentaire.auteurType === 'boutique') {
      return 'Ma boutique';
    } else if (commentaire.auteurType === 'systeme') {
      return 'Système';
    } else {
      return 'Support';
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
      default: return 'support-comment';
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

  // ===== UTILITAIRES =====
  pageChanged(page: number): void {
    this.filters.page = page;
    this.loadTickets();
  }

  get currentPage(): number {
    return this.filters.page || 1;
  }

  get safeItemsPerPage(): number {
    return this.filters.limit ?? 10;
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  get totalItems(): number {
    return this.ticketStats?.total || 0;
  }
}