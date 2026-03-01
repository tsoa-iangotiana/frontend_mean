// components/boutique/commandes/commandes.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule }       from '@angular/common';
import { FormsModule }        from '@angular/forms';
import { RouterModule }       from '@angular/router';
import { NgbModal, NgbModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { Subscription }       from 'rxjs';
import { distinctUntilChanged } from 'rxjs/operators';

import {
  CommandeBoutiqueService,
  CommandeEnrichie,
  CommandesResponse,
  CommandesFiltres,
  StatutCommande,
  TriCommande,
} from '../../../services/boutique/commande/commande.service';

import { BoutiqueContextService } from '../../../services/boutique/context/boutique.context.service';
import { ToastService }           from '../../../services/utils/toast/toast.service';

@Component({
  selector:    'app-commandes',
  standalone:  true,
  imports:     [CommonModule, FormsModule, RouterModule, NgbModule, NgbPaginationModule],
  templateUrl: './commande.component.html',
  styleUrls:   ['./commande.component.css']
})
export class CommandeComponent implements OnInit, OnDestroy {

  // ===== ÉTATS =====
  loading        = false;
  actionLoading  = false; // spinner sur le bouton confirmer du modal

  // ===== DONNÉES =====
  commandes:     CommandeEnrichie[] = [];
  total = this.commandes.length;
  totalEnAttente = 0; // Nombre de commandes en attente (statut EN_ATTENTE)

  // ===== STATISTIQUES =====
  statistiques = {

    total_commandes:     0,
    total_depense_avec_livraison:       0,
    moyenne_panier:      0,
    repartition_statuts: { EN_ATTENTE: 0, PAYEE: 0, LIVREE: 0, RECUPEREE: 0, ANNULEE: 0 }
  };

  // ===== PAGINATION =====
  currentPage  = 1;
  itemsPerPage = 10;
  totalItems   = 0;
  totalPages   = 1;

  // ===== FILTRES =====
  filtreStatut:      string        = '';
  filtreUtilisateur: string        = '';
  filtreDateDebut:   string        = '';
  filtreDateFin:     string        = '';
  filtrePrixMin:     number | null = null;
  filtrePrixMax:     number | null = null;
  filtreTri:         TriCommande   = 'date_desc';
  filtresPanelOuvert = false;

  readonly statutOptions: { value: string; label: string }[] = [
    {value: '',                 label: 'Tous'                    },
    { value: 'EN_ATTENTE',           label: 'En attente'              },
    { value: 'LIVREE',               label: 'Livrées'                 },
    { value: 'RECUPEREE',            label: 'Récupérées'              },
    { value: 'ANNULEE',              label: 'Annulées'                },
    { value: 'EN_ATTENTE,LIVREE',    label: 'En attente + Livrées'    },
    { value: 'EN_ATTENTE,RECUPEREE', label: 'En attente + Récupérées' },
  ];

  readonly triOptions: { value: TriCommande; label: string }[] = [
    { value: 'date_desc',    label: 'Plus récentes'  },
    { value: 'date_asc',     label: 'Plus anciennes' },
    { value: 'montant_desc', label: 'Montant ↓'      },
    { value: 'montant_asc',  label: 'Montant ↑'      },
    { value: 'statut',       label: 'Par statut'     },
  ];

  // ===== MODAL CONFIRMATION =====
  commandeSelectionnee: CommandeEnrichie | null = null;
  actionSelectionnee:   'livrer' | 'recuperer' | null = null;

  // ===== SUBSCRIPTIONS =====
  private subscriptions: Subscription[] = [];

  constructor(
    private commandeService:  CommandeBoutiqueService,
    private boutiqueContext:  BoutiqueContextService,
    private toastService:     ToastService,
    private modalService:     NgbModal,
    private cdr:              ChangeDetectorRef
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  ngOnInit(): void {
    setTimeout(() => {
      this.subscriptions.push(
        this.boutiqueContext.boutiqueSelectionnee$.pipe(
          distinctUntilChanged((a: any, b: any) => a?._id === b?._id)
        ).subscribe(boutique => {
          if (boutique) {
            console.log('🏪 Boutique sélectionnée:', boutique.nom);
            this.currentPage = 1;
            this.loadCommandes();
            console.log('commandes chargées :', this.commandes);
            
          } else {
            console.warn('⚠️ Aucune boutique sélectionnée');
            this.loading = false;
            this.cdr.markForCheck();
          }
        })
      );
    });
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CHARGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  loadCommandes(): void {
    const boutique = this.boutiqueContext.getBoutiqueSelectionnee();
    if (!boutique) {
      this.toastService.show('Aucune boutique sélectionnée', 'warning');
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    const params: CommandesFiltres = {
      statut: this.filtreStatut,
      tri:    this.filtreTri,
      page:   this.currentPage,
      limit:  this.itemsPerPage,
    };

    if (this.filtreUtilisateur) params.utilisateur = this.filtreUtilisateur;
    if (this.filtreDateDebut)   params.date_debut   = this.filtreDateDebut;
    if (this.filtreDateFin)     params.date_fin      = this.filtreDateFin;
    if (this.filtrePrixMin)     params.prix_min      = this.filtrePrixMin;
    if (this.filtrePrixMax)     params.prix_max      = this.filtrePrixMax;

    this.commandeService.getCommandes(boutique._id!, params).subscribe({
      next: (response: CommandesResponse) => {
        this.commandes      = response.commandes;
        this.totalItems     = response.pagination.total;
        this.totalPages     = response.pagination.pages;
        this.statistiques   = response.statistiques;
        this.totalEnAttente = response.total_en_attente;
        this.total = response.pagination.total;
        this.loading        = false;
        console.log(`📦 ${this.commandes.length} commande(s) chargée(s)`);
        console.log('Statistiques:', this.statistiques);
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('❌ Erreur chargement commandes:', error);
        this.toastService.show(error.error?.message || 'Erreur lors du chargement des commandes', 'error');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FILTRES
  // ─────────────────────────────────────────────────────────────────────────

  appliquerFiltres(): void {
    this.currentPage       = 1;
    this.filtresPanelOuvert = false;
    this.loadCommandes();
  }

  reinitialiserFiltres(): void {
    this.filtreStatut      = '';
    this.filtreUtilisateur = '';
    this.filtreDateDebut   = '';
    this.filtreDateFin     = '';
    this.filtrePrixMin     = null;
    this.filtrePrixMax     = null;
    this.filtreTri         = 'date_desc';
    this.currentPage       = 1;
    this.loadCommandes();
  }

  changerTri(tri: TriCommande): void {
    this.filtreTri   = tri;
    this.currentPage = 1;
    this.loadCommandes();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAGINATION
  // ─────────────────────────────────────────────────────────────────────────

  pageChanged(page: number): void {
    this.currentPage = page;
    this.loadCommandes();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MODAL CONFIRMATION — LIVRER / RÉCUPÉRER
  // ─────────────────────────────────────────────────────────────────────────

  ouvrirConfirmation(commande: CommandeEnrichie, modal: any): void {
    if (!commande.peut_livrer && !commande.peut_recuperer) return;
    this.commandeSelectionnee = commande;
    this.actionSelectionnee   = commande.peut_livrer ? 'livrer' : 'recuperer';
    this.modalService.open(modal, { centered: true, backdrop: 'static' });
  }

  confirmerAction(modal: any): void {
    const boutique = this.boutiqueContext.getBoutiqueSelectionnee();
    if (!boutique || !this.commandeSelectionnee || !this.actionSelectionnee) return;

    this.actionLoading = true;
    this.cdr.detectChanges();

    const action$ = this.actionSelectionnee === 'livrer'
      ? this.commandeService.marquerLivree(boutique._id!, this.commandeSelectionnee._id)
      : this.commandeService.marquerRecuperee(boutique._id!, this.commandeSelectionnee._id);

    this.subscriptions.push(
      action$.subscribe({
        next: (res) => {
          this.toastService.show(res.message, 'success');
          this.actionLoading = false;
          modal.close();
          this.loadCommandes();
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Erreur action commande:', error);
          this.toastService.show(error.error?.message || 'Une erreur est survenue', 'error');
          this.actionLoading = false;
          modal.close();
          this.cdr.detectChanges();
        }
      })
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITAIRES
  // ─────────────────────────────────────────────────────────────────────────

  badgeClass(statut: StatutCommande): string {
    const map: Record<StatutCommande, string> = {
      EN_ATTENTE: 'text-bg-warning',
      PAYEE:      'text-bg-primary',
      LIVREE:     'text-bg-success',
      RECUPEREE:  'text-bg-info',
      ANNULEE:    'text-bg-danger',
    };
    return map[statut] ?? 'text-bg-secondary';
  }

  btnActionClass(commande: CommandeEnrichie): string {
    return commande.peut_livrer ? 'btn-primary' : 'btn-success';
  }

  labelAction(commande: CommandeEnrichie): string {
    if (commande.peut_livrer)    return 'Marquer livrée';
    if (commande.peut_recuperer) return 'Marquer récupérée';
    return '';
  }

  iconAction(commande: CommandeEnrichie): string {
    return commande.peut_livrer ? 'bi-truck' : 'bi-check-circle';
  }

  initiales(commande: CommandeEnrichie): string {
    const u = commande.utilisateur;
    if (!u) return '?';
    return ((u.username?.charAt(0) ?? '') + (u.username?.charAt(0) ?? '')).toUpperCase();
  }

  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-MG').format(montant) + ' Ar';
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(date));
  }

  get filtresActifs(): boolean {
    return !!(
      (this.filtreStatut && this.filtreStatut !== 'EN_ATTENTE') ||
      this.filtreUtilisateur || this.filtreDateDebut ||
      this.filtreDateFin     || this.filtrePrixMin   || this.filtrePrixMax
    );
  }
}