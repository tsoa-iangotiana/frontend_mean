import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { filter, Subscription } from 'rxjs';
import {
  LoyerService,
  HistoriquePaiements,
  PaiementLoyer,
} from '../../../services/boutique/paiement/loyer.service';
import { BoutiqueContextService } from '../../../services/boutique/context/boutique.context.service';
import { ToastService } from '../../../services/utils/toast/toast.service';

@Component({
  selector: 'app-historique-loyer',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './historique-loyer.component.html',
  styleUrls: ['./historique-loyer.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush, // règle 3 : OnPush sur tous les composants
})
export class HistoriqueLoyerComponent implements OnInit, OnDestroy {
  historique: HistoriquePaiements | null = null;
  paiements: PaiementLoyer[] = [];
  isLoading = false;

  totalDepense = 0;
  totalPaiements = 0;
  moyenneParPaiement = 0;

  filterPeriode: string = 'tous';
  filterStatut: string = 'tous';
  searchTerm: string = '';
  dateDebut: string = '';
  dateFin: string = '';

  currentPage = 1;
  itemsPerPage = 10;
  filteredPaiements: PaiementLoyer[] = [];
  paginatedPaiements: PaiementLoyer[] = [];
  totalPages = 1;

  boutiqueSelectionnee: any = null;
  private subscriptions: Subscription = new Subscription();

  periodeOptions = [
    { value: 'tous', label: 'Toutes les périodes' },
    { value: 'mensuel', label: 'Mensuel' },
    { value: 'trimestriel', label: 'Trimestriel' },
    { value: 'annuel', label: 'Annuel' },
  ];

  statutOptions = [
    { value: 'tous', label: 'Tous les statuts' },
    { value: 'ACTIF', label: 'Actif' },
    { value: 'EXPIRE', label: 'Expiré' },
  ];

  constructor(
    private loyerService: LoyerService,
    private boutiqueContext: BoutiqueContextService,
    private toastr: ToastService,
    private cdr: ChangeDetectorRef, // règle 3 : nécessaire avec OnPush
    public router: Router
  ) {}

  ngOnInit(): void {
    // Règle 2 : filter() remplace le if/else dans le subscriber.
    // On ne s'intéresse qu'aux valeurs non-nulles.
    // Si la boutique est null, on ne fait rien : le navbar va émettre
    // une valeur fraîche dans quelques millisecondes via setBoutiqueSelectionnee(),
    // et le subscriber sera déclenché à nouveau automatiquement.
    this.subscriptions.add(
      this.boutiqueContext.boutiqueSelectionnee$
        .pipe(filter((boutique) => !!boutique))
        .subscribe((boutique) => {
          this.boutiqueSelectionnee = boutique;
          this.loadHistorique();
          this.cdr.markForCheck(); // règle 3 : markForCheck dans un subscribe
        })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadHistorique(): void {
    this.isLoading = true;
    this.cdr.markForCheck();

    this.loyerService.getHistorique().subscribe({
      next: (data) => {
        this.historique = data;
        this.paiements = data.paiements || [];
        this.totalDepense = data.montant_total || 0;
        this.totalPaiements = data.total_paiements || 0;
        this.moyenneParPaiement =
          this.totalPaiements > 0 ? this.totalDepense / this.totalPaiements : 0;

        this.applyFilters();
        this.isLoading = false;
        this.cdr.markForCheck(); // règle 3 : on notifie Angular que les données sont là
      },
      error: (error) => {
        console.error('Erreur chargement historique:', error);
        this.toastr.show("Erreur lors du chargement de l'historique", 'Erreur');
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  applyFilters(): void {
    let filtered = [...this.paiements];

    if (this.filterPeriode !== 'tous') {
      filtered = filtered.filter((p) => p.periode === this.filterPeriode);
    }

    if (this.filterStatut !== 'tous') {
      filtered = filtered.filter((p) => {
        const estActif = new Date(p.date_fin) > new Date();
        return this.filterStatut === 'ACTIF' ? estActif : !estActif;
      });
    }

    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter((p) => {
        const date = new Date(p.date_paiement);
        const moisAnnee = date
          .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
          .toLowerCase();
        return moisAnnee.includes(searchLower);
      });
    }

    if (this.dateDebut) {
      const debut = new Date(this.dateDebut);
      filtered = filtered.filter((p) => new Date(p.date_paiement) >= debut);
    }
    if (this.dateFin) {
      const fin = new Date(this.dateFin);
      fin.setHours(23, 59, 59);
      filtered = filtered.filter((p) => new Date(p.date_paiement) <= fin);
    }

    this.filteredPaiements = filtered;
    this.totalPages = Math.ceil(this.filteredPaiements.length / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePaginatedList();
  }

  updatePaginatedList(): void {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    this.paginatedPaiements = this.filteredPaiements.slice(start, end);
  }

  pageChanged(page: number): void {
    this.currentPage = page;
    this.updatePaginatedList();
  }

  resetFilters(): void {
    this.filterPeriode = 'tous';
    this.filterStatut = 'tous';
    this.searchTerm = '';
    this.dateDebut = '';
    this.dateFin = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  getStatutClass(statut: string | undefined): string {
    return this.loyerService.getStatutBadgeClass(statut || '');
  }

  getStatutLibelle(statut: string | undefined): string {
    return this.loyerService.getStatutLibelle(statut || '');
  }

  getPeriodeLibelle(periode: string): string {
    return this.loyerService.getPeriodeLibelle(periode);
  }

  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  formatDateLong(date: Date | string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  getPeriodeIcon(periode: string): string {
    switch (periode) {
      case 'mensuel': return 'fa-calendar-alt';
      case 'trimestriel': return 'fa-calendar-week';
      case 'annuel': return 'fa-calendar';
      default: return 'fa-calendar';
    }
  }

  navigateToPaiement(): void {
    this.router.navigate(['/boutique/loyer/payer']);
  }

  get plusGrosPaiement(): number {
    return this.paiements.length > 0
      ? Math.max(...this.paiements.map((p) => p.montant))
      : 0;
  }

  get plusPetitPaiement(): number {
    return this.paiements.length > 0
      ? Math.min(...this.paiements.map((p) => p.montant))
      : 0;
  }
}