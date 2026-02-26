import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProfilService } from '../../../services/boutique/profil/profil.service';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs';
import { Boutique } from '../../../services/boutique/profil/profil.service';



interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

@Component({
  selector: 'app-admin-boutiques',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './boutique-management.component.html',
  styleUrls: ['./boutique-management.component.css']
})
export class BoutiqueManagementComponent implements OnInit, OnDestroy {
 Math = Math;
  boutiques: Boutique[] = [];
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  
  // Filtres
  searchTerm = '';
  activeFilter: 'all' | 'active' | 'inactive' = 'all';
  
  // Pagination
  pagination: PaginationInfo = {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10
  };

  // Loading states pour les toggles individuels
  togglingBoutiqueId: string | undefined = undefined;

  // Search debounce
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private profilService: ProfilService,private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadBoutiques();

    // Debounce pour la recherche
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.pagination.currentPage = 1;
      this.loadBoutiques();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

 loadBoutiques(): void {
  this.loading = true;
  this.error = null;

  const filters: any = {
    page: this.pagination.currentPage,
    limit: this.pagination.itemsPerPage
  };

  if (this.activeFilter !== 'all') {
    filters.active = this.activeFilter === 'active';
  }

  if (this.searchTerm.trim()) {
    filters.search = this.searchTerm.trim();
  }

  this.profilService.getAllBoutiques(filters).subscribe({
    next: (response: any) => {
      // Vérification que response.boutiques est bien un tableau
      if (response && response.success && Array.isArray(response.boutiques)) {
        this.boutiques = response.boutiques;
        this.pagination.totalItems = response.count || response.boutiques.length;
        this.pagination.totalPages = Math.ceil(this.pagination.totalItems / this.pagination.itemsPerPage);
      } else {
        this.boutiques = [];
        console.error('Format de réponse invalide:', response);
      }
      this.loading = false;
      this.cdr.markForCheck();
    },
    error: (err) => {
      console.error('Erreur chargement boutiques:', err);
      this.error = 'Impossible de charger la liste des boutiques';
      this.loading = false;
      this.cdr.markForCheck();
    }
  });
}
  toggleBoutique(boutique: Boutique): void {
    this.togglingBoutiqueId = boutique._id;
    this.error = null;
    this.successMessage = null;

    this.profilService.toggleBoutiqueActive(boutique._id!).subscribe({
      next: (response: any) => {
        // Mettre à jour le statut localement
        boutique.active = response.active;
        this.togglingBoutiqueId = undefined;
        this.successMessage = `Boutique ${boutique.nom} ${response.active ? 'activée' : 'désactivée'} avec succès`;
        
        // Auto-hide success message after 3 seconds
        setTimeout(() => this.successMessage = null, 3000);
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur toggle boutique:', err);
        this.error = err.error?.message || 'Erreur lors du changement de statut';
        this.togglingBoutiqueId = undefined;
      }
    });
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  onFilterChange(): void {
    this.pagination.currentPage = 1;
    this.loadBoutiques();
    this.cdr.markForCheck();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.pagination.totalPages) {
      this.pagination.currentPage = page;
      this.loadBoutiques();
      this.cdr.markForCheck();
    }
  }

  getStatusBadgeClass(active: boolean): string {
    return active 
      ? 'bg-success text-white' 
      : 'bg-danger text-white';
  }

  getStatusText(active: boolean): string {
    return active ? 'Active' : 'Inactive';
  }

  // Calculer les pages pour la pagination
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
}