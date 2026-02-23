import { User } from './../../../services/auth';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProfilService, Boutique } from '../../../services/boutique/profil/profil.service';

@Component({
  selector: 'app-liste-boutique',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ListeBoutique.html',
  styleUrls: ['./liste-boutique.css']
})
export class ListeBoutique implements OnInit {
  boutiques: Boutique[] = [];
  filteredBoutiques: Boutique[] = [];
  loading = false;
  error: string | null = null;

  // Pagination
  currentPage = 1;
  itemsPerPage = 9;
  totalItems = 0;
  totalPages = 1;

  // Filtres
  searchTerm = '';
  selectedCategory = '';
  activeFilter: boolean | null = null;
  sortBy: 'nom' | 'note' | 'date' = 'date';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Catégories disponibles (à charger depuis le service)
  categories: string[] = [];

  // Statistiques
  stats = {
    total: 0,
    actives: 0,
    inactives: 0
  };

  constructor(
    private profilService: ProfilService,
    private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadBoutiques();
  }

  loadBoutiques(): void {
    this.loading = true;
    this.error = null;

    this.profilService.getAllBoutiques().subscribe({
      next: (response) => {
        if (response.success) {
          this.boutiques = response.boutiques;
          this.totalItems = response.totalBoutiques || this.boutiques.length;
          this.totalPages = response.totalPages || 1;

          this.calculateStats();
          this.extractCategories();
          this.applyFilters();
        }
        this.loading = false;
        this.cdr.detectChanges(); // Force la détection des changements
      },
      error: (err) => {
        console.error('Erreur lors du chargement des boutiques:', err);
        this.error = 'Impossible de charger la liste des boutiques';
        this.loading = false;
      }
    });
  }

  calculateStats(): void {
    this.stats = {
      total: this.boutiques.length,
      actives: this.boutiques.filter(b => b.active).length,
      inactives: this.boutiques.filter(b => !b.active).length
    };
  }

  extractCategories(): void {
    const categorySet = new Set<string>();
    this.boutiques.forEach(boutique => {
      boutique.categories?.forEach(cat => {
        if (cat.valide) {
          categorySet.add(cat.nom);
        }
      });
    });
    this.categories = Array.from(categorySet).sort();
  }

  applyFilters(): void {
    let filtered = [...this.boutiques];

    // Filtre par recherche
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(b =>
        b.nom.toLowerCase().includes(term) ||
        b.slogan?.toLowerCase().includes(term) ||
        b.description?.toLowerCase().includes(term)
      );
    }

    // Filtre par catégorie
    if (this.selectedCategory) {
      filtered = filtered.filter(b =>
        b.categories?.some(cat => cat.nom === this.selectedCategory && cat.valide)
      );
    }

    // Filtre par statut
    if (this.activeFilter !== null) {
      filtered = filtered.filter(b => b.active === this.activeFilter);
    }

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (this.sortBy) {
        case 'nom':
          comparison = a.nom.localeCompare(b.nom);
          break;
        case 'note':
          comparison = (b.note_moyenne || 0) - (a.note_moyenne || 0);
          break;
        case 'date':
          comparison = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
          break;
      }

      return this.sortOrder === 'asc' ? -comparison : comparison;
    });

    this.filteredBoutiques = filtered;
    this.totalItems = filtered.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1; // Reset à la première page lors du filtrage
  }

  get paginatedBoutiques(): Boutique[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredBoutiques.slice(start, end);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategory = '';
    this.activeFilter = null;
    this.sortBy = 'date';
    this.sortOrder = 'desc';
    this.applyFilters();
  }

  toggleSort(field: 'nom' | 'note' | 'date'): void {
    if (this.sortBy === field) {
      this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = field;
      this.sortOrder = 'desc';
    }
    this.applyFilters();
  }

  getBoxInfo(boutique: Boutique): string {
    if (!boutique.box) return 'Non assigné';
    return `Box ${boutique.box.numero} - ${boutique.box.surface}m²`;
  }

  getResponsableName(boutique: Boutique): string {
    if (!boutique.responsable) return 'Non assigné';
    // Si responsable est un objet avec prénom/nom
    if (typeof boutique.responsable === 'object') {
      return `${boutique.responsable || ''} ${boutique.responsable|| ''}`.trim() || 'Responsable';
    }
    return 'Responsable';
  }

  getCategoryNames(boutique: Boutique): string[] {
    return boutique.categories
      ?.filter(cat => cat.valide)
      .map(cat => cat.nom) || [];
  }

  getStars(note: number = 0): number[] {
    return [1, 2, 3, 4, 5];
  }

  formatDate(date: Date | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  Math = Math;
}
