// box-management.component.ts
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

// Services
import { BoxService, BoxWithDetails, BoxFilters, BoxStats, BoxHistorique } from '../../../services/admin/box/box.service';
import { ProfilService, Boutique } from '../../../services/boutique/profil/profil.service';

@Component({
  selector: 'app-box-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    HttpClientModule
  ],
  templateUrl: './box-management.component.html',
  styleUrls: ['./box-management.component.css']
})
export class BoxManagementComponent implements OnInit {
  // Tableau
  boxs: BoxWithDetails[] = [];
  
  // Statistiques
  stats: BoxStats = {
    total_box: 0,
    box_libres: 0,
    box_occupes: 0,
    loyer_moyen: 0,
    surface_moyenne: 0
  };

  // Filtres
  filters: BoxFilters = {
    libre: undefined,
    search: '',
    page: 1,
    limit: 10,
    tri: 'numero_asc'
  };

  // États
  totalBox = 0;
  currentPage = 1;
  totalPages = 1;
  loading = false;
  selectedBox: BoxWithDetails | null = null;
  showHistorique = false;
  historiqueBox: BoxHistorique[] = [];
  loadingHistorique = false;
  showNewBoxForm = false;

  // Listes déroulantes
  boutiquesDisponibles: Boutique[] = [];
  boutiquesSansBox: Boutique[] = [];

  // Formulaires
  attribuerForm: FormGroup;
  transfererForm: FormGroup;
  libererForm: FormGroup;
  nouveauBoxForm: FormGroup;

  // Options de tri
  sortOptions = [
    { value: 'numero_asc', label: 'Numéro (A-Z)' },
    { value: 'numero_desc', label: 'Numéro (Z-A)' },
    { value: 'surface_asc', label: 'Surface (croissante)' },
    { value: 'surface_desc', label: 'Surface (décroissante)' },
    { value: 'prix_asc', label: 'Prix (croissant)' },
    { value: 'prix_desc', label: 'Prix (décroissant)' }
  ];

  constructor(
    private boxService: BoxService,
    private boutiqueService: ProfilService,
      private cdr: ChangeDetectorRef,
    private fb: FormBuilder
  ) {
    // Initialisation des formulaires
    const today = new Date().toISOString().split('T')[0];
    
    this.attribuerForm = this.fb.group({
      boutiqueId: ['', Validators.required],
      date_debut: [today]
    });

    this.transfererForm = this.fb.group({
      nouvelleBoutiqueId: ['', Validators.required],
      date_transfert: [today]
    });

    this.libererForm = this.fb.group({
      date_fin: [today]
    });

    this.nouveauBoxForm = this.fb.group({
      numero: ['', Validators.required],
      surface: ['', [Validators.required, Validators.min(1)]],
      prix_loyer: ['', [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit() {
    this.loadBoxes();
    this.loadBoutiques();
     this.cdr.markForCheck(); 
  }

  // ========== CHARGEMENT DES DONNÉES ==========

  loadBoxes() {
    this.loading = true;
    this.boxService.getAllBox(this.filters).subscribe({
      next: (response) => {
        console.log('Boxs reçus:', response);
        this.boxs = response.boxs;
        this.stats = response.statistiques;
        this.totalBox = response.pagination.total;
        this.totalPages = response.pagination.pages;
        this.currentPage = response.pagination.page;
        this.loading = false;
        this.cdr.markForCheck(); 
      },
      error: (error) => {
        console.error('Erreur chargement box:', error);
        this.loading = false;
        alert('Erreur lors du chargement des box');
      }
    });
  }

  loadBoutiques() {
    this.boutiqueService.getAllBoutiques({ active: true, limit: 100 }).subscribe({
      next: (response) => {
        this.boutiquesDisponibles = response.boutiques || response.docs || [];
        this.updateBoutiquesSansBox();
          this.cdr.markForCheck(); 
      },
      error: (error) => {
        console.error('Erreur chargement boutiques:', error);
      }
    });
  }

  loadHistorique(boxId: string) {
    this.loadingHistorique = true;
    this.boxService.getBoxHistorique(boxId).subscribe({
      next: (response) => {
        console.log('Historique reçu:', response);
        this.historiqueBox = response.historique;
        this.loadingHistorique = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Erreur chargement historique:', error);
        this.loadingHistorique = false;
      }
    });
  }

  // ========== GESTION DES FILTRES ==========

  onFilterChange() {
    this.filters.page = 1;
    this.loadBoxes();
  }

  onSearch(event: any) {
    this.filters.search = event.target.value;
    this.filters.page = 1;
    this.loadBoxes();
  }

  onStatusChange(event: any) {
    const value = event.target.value;
    this.filters.libre = value === '' ? undefined : value === 'true';
    this.filters.page = 1;
    this.loadBoxes();
  }

  onSortChange(event: any) {
    this.filters.tri = event.target.value;
    this.filters.page = 1;
    this.loadBoxes();
  }

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.filters.page = page;
      this.loadBoxes();
    }
  }

  // ========== SÉLECTION D'UN BOX ==========

  selectBox(box: BoxWithDetails) {
    this.selectedBox = box;
    this.showHistorique = false;
    this.historiqueBox = [];
    
    // Mise à jour des formulaires
    this.updateBoutiquesSansBox();
    
    // Réinitialiser les formulaires
    const today = new Date().toISOString().split('T')[0];
    this.attribuerForm.reset({ date_debut: today });
    this.transfererForm.reset({ date_transfert: today });
    this.libererForm.reset({ date_fin: today });
  }

  closeDetails() {
    this.selectedBox = null;
    this.showHistorique = false;
    this.historiqueBox = [];
  }

  toggleHistorique() {
    if (this.selectedBox) {
      this.showHistorique = !this.showHistorique;
      if (this.showHistorique) {
        this.loadHistorique(this.selectedBox._id);
        console.log(this.loadHistorique(this.selectedBox._id));
      }
    }
  }

  // ========== ACTIONS SUR LES BOX ==========

  createBox() {
    if (this.nouveauBoxForm.invalid) return;

    this.loading = true;
    this.boxService.createBox(this.nouveauBoxForm.value).subscribe({
      next: (response) => {
        this.loadBoxes();
        this.nouveauBoxForm.reset();
        this.showNewBoxForm = false;
        alert('Box créé avec succès');
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur création box:', error);
        alert("Erreur lors de la création: " + (error.error?.message || error.message));
        this.loading = false;
      }
    });
  }

  attribuerBox() {
    if (!this.selectedBox || this.attribuerForm.invalid) return;

    this.loading = true;
    this.boxService.attribuerBox(this.selectedBox._id, this.attribuerForm.value).subscribe({
      next: (response) => {
        this.loadBoxes();
        this.closeDetails();
        alert('Box attribué avec succès');
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur attribution box:', error);
        alert("Erreur lors de l'attribution: " + (error.error?.message || error.message));
        this.loading = false;
      }
    });
  }

  libererBox() {
    if (!this.selectedBox) return;

    if (!confirm(`Êtes-vous sûr de vouloir libérer le box ${this.selectedBox.numero} ?`)) {
      return;
    }

    this.loading = true;
    this.boxService.libererBox(this.selectedBox._id, this.libererForm.value).subscribe({
      next: (response) => {
        this.loadBoxes();
        this.closeDetails();
        alert('Box libéré avec succès');
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur libération box:', error);
        alert("Erreur lors de la libération: " + (error.error?.message || error.message));
        this.loading = false;
      }
    });
  }

  transfererBox() {
    if (!this.selectedBox || this.transfererForm.invalid) return;

    this.loading = true;
    this.boxService.transfererBox(this.selectedBox._id, this.transfererForm.value).subscribe({
      next: (response) => {
        this.loadBoxes();
        this.closeDetails();
        alert('Box transféré avec succès');
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur transfert box:', error);
        alert("Erreur lors du transfert: " + (error.error?.message || error.message));
        this.loading = false;
      }
    });
  }

  deleteBox(box: BoxWithDetails) {
    if (!box.libre) {
      alert('Impossible de supprimer un box occupé');
      return;
    }

    if (!confirm(`Supprimer définitivement le box ${box.numero} ?`)) {
      return;
    }

    this.loading = true;
    this.boxService.deleteBox(box._id).subscribe({
      next: (response) => {
        this.loadBoxes();
        if (this.selectedBox?._id === box._id) {
          this.closeDetails();
        }
        alert('Box supprimé avec succès');
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur suppression box:', error);
        alert("Erreur lors de la suppression: " + (error.error?.message || error.message));
        this.loading = false;
      }
    });
  }

  // ========== UTILITAIRES ==========

  private updateBoutiquesSansBox() {
    this.boutiquesSansBox = this.boutiquesDisponibles.filter(b => !b.box);
  }

  getStatusBadgeClass(libre: boolean): string {
    return libre ? 'badge bg-success' : 'badge bg-danger';
  }

  getStatusText(libre: boolean): string {
    return libre ? 'Libre' : 'Occupé';
  }

  getOccupationText(box: BoxWithDetails): string {
    if (box.libre || !box.occupe_par) return '-';
    return box.occupe_par.nom;
  }

  getOccupationSince(box: BoxWithDetails): string {
    if (box.libre || !box.historique_actif) return '';
    const date = new Date(box.historique_actif.depuis);
    return `Depuis le ${date.toLocaleDateString('fr-FR')}`;
  }

  getDureeOccupation(debut: string, fin?: string): string {
    const start = new Date(debut);
    const end = fin ? new Date(fin) : new Date();
    const jours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return `${jours} jour${jours > 1 ? 's' : ''}`;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
  }
}