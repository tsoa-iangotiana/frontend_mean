import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { RouterModule } from '@angular/router';  // ← IMPORTANT

import { ProduitService, Produit, ProduitsResponse } from '../../../services/boutique/produit/produit.service';
import { ToastService } from '../../../services/utils/toast/toast.service';
import { PanierService } from '../../../services/acheteur/panier/panier.service';
import { ActivatedRoute } from '@angular/router';
import { Boutique } from '../../../services/boutique/profil/profil.service';

@Component({
  selector: 'app-liste-produits-acheteur',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './liste-produits.html',
  styleUrls: ['./liste-produits.css']
})
export class ListeProduitsAcheteurComponent implements OnInit, OnDestroy {
  boutiqueId: string | null = null;
  boutiqueNom?: string;
  boutiqueInfo?: Boutique;

  // Données
  produits: Produit[] = [];
  totalProduits = 0;

  // Pagination - Style ListeBoutique
  currentPage = 1;
  itemsPerPage = 12;  // correspond à pageSize
  totalPages = 1;

  // États
  loading = false;
  error: string | null = null;
  initialLoad = true;

  // Filtres
  filters = {
    search: '',
    categorie: ''
  };

  // Options de pagination (gardé pour la compatibilité)
  pageSizeOptions = [12, 24, 48, 96];

  // Pour la recherche en temps réel
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  // Gestion du panier
  addingToCart: Set<string> = new Set();

  // Pour accéder à Math dans le template
  Math = Math;

  constructor(
    private produitService: ProduitService,
    private toastService: ToastService,
    private panierService: PanierService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.boutiqueId = this.route.snapshot.paramMap.get('boutiqueId');

    if (!this.boutiqueId) {
      this.error = 'Boutique non spécifiée';
      this.toastService.show('Boutique non spécifiée', 'error');
      this.cdr.detectChanges();
      return;
    }

    console.log('✅ ID boutique récupéré depuis URL:', this.boutiqueId);

    this.loadBoutiqueInfo();
    this.loadProduits();

    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadProduits();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charger les informations de la boutique
   */
  private loadBoutiqueInfo(): void {
    if (!this.boutiqueId) return;

    this.produitService.getBoutiqueInfo(this.boutiqueId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('📦 Réponse brute:', response);

          // ✅ Extraire la boutique de la propriété 'boutique'
          this.boutiqueInfo = response.boutique;

          // Debug
          console.log('✅ Infos boutique extraites:', this.boutiqueInfo);
          console.log('🏷️ Nom boutique:', this.boutiqueInfo?.nom);
          console.log('🏪 Slogan:', this.boutiqueInfo?.slogan);

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('❌ Erreur chargement infos boutique:', err);
          // Fallback
          this.boutiqueInfo = { nom: `Boutique ${this.boutiqueId?.substring(0, 8)}...` } as any;
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Getter pour les catégories (plus propre)
   */
  get categories(): { _id: string; nom: string }[] {
    return this.boutiqueInfo?.categories?.filter((cat: any) => cat.valide) || [];
  }

  loadProduits(): void {
    console.log('🔵 loadProduits appelé - page:', this.currentPage, 'loading:', this.loading);

    if (!this.boutiqueId) return;

    if (this.loading) {
      console.log('⏳ Déjà en chargement, ignore cet appel');
      return;
    }

    this.loading = true;
    this.error = null;

    const params = {
      page: this.currentPage,
      limit: this.itemsPerPage,
      search: this.filters.search || undefined,
      categorie: this.filters.categorie || undefined,
      actif: true
    };

    this.produitService.getProduitsByBoutique(this.boutiqueId, params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ProduitsResponse) => {
          console.log('🟢 Réception produits:', response.produits.length);
          this.produits = response.produits;
          // 🔍 AJOUTE CE LOG POUR VOIR LES STOCKS
          console.log('📊 Détail des stocks:', this.produits.map(p => ({
            nom: p.nom,
            stock: p.stock,
            actif: p.actif
          })));
          this.totalProduits = response.total;
          this.totalPages = response.totalPages;
          this.currentPage = response.currentPage;
          this.loading = false;
          this.initialLoad = false;
          this.cdr.detectChanges();
          console.log('✅ Chargement terminé');
        },
        error: (err) => {
          console.error('🔴 Erreur:', err);
          this.error = 'Impossible de charger les produits';
          this.loading = false;
          this.initialLoad = false;
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Getter pour les produits paginés (comme dans ListeBoutique)
   */
  get paginatedProduits(): Produit[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    // console.log('stock', this.produits.map(p => ({ stock: p.stock })));
    return this.produits.slice(start, end);
  }

  /**
   * Changement de page (comme dans ListeBoutique)
   */
  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadProduits();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.filters.search = value;
    this.searchSubject.next(value);
  }

  onCategorieChange(categorieId: string): void {
    this.filters.categorie = categorieId;
    this.currentPage = 1;
    this.loadProduits();
  }

  resetFilters(): void {
    this.filters = {
      search: '',
      categorie: ''
    };
    this.currentPage = 1;
    this.loadProduits();
  }

  // Gardé pour compatibilité avec les appels existants
  onPageChange(page: number): void {
    this.changePage(page);
  }

  // Gardé pour compatibilité
  onPageSizeChange(size: number): void {
    if (size !== this.itemsPerPage) {
      this.itemsPerPage = size;
      this.currentPage = 1;
      this.loadProduits();
    }
  }

  addToCart(produit: Produit): void {
    if (produit.stock <= 0) {
      this.toastService.show('Ce produit n\'est pas disponible', 'warning');
      return;
    }

    if (this.addingToCart.has(produit._id)) return;

    this.addingToCart.add(produit._id);
    this.cdr.detectChanges();

    setTimeout(() => {
      this.toastService.show(`${produit.nom} ajouté au panier`, 'success');
      this.addingToCart.delete(produit._id);
      this.cdr.detectChanges();
    }, 500);
  }

  canAddToCart(produit: Produit): boolean {
    return produit.actif && produit.stock > 0;
  }

  getStockLabel(produit: Produit): string {
    if (produit.stock <= 0) return 'Rupture de stock';
    if (produit.stock <= 5) return 'Stock très faible';
    if (produit.stock <= 10) return 'Stock faible';
    return 'En stock';
  }

  getStockClass(produit: Produit): string {
    if (produit.stock <= 0) return 'stock-rupture';
    if (produit.stock <= 5) return 'stock-critique';
    if (produit.stock <= 10) return 'stock-faible';
    return 'stock-normal';
  }

  formatPrice(prix: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(prix);
  }

  getUniteLabel(unite: string): string {
    const unites: { [key: string]: string } = {
      'unite': 'pièce',
      'kg': 'kilogramme',
      'litre': 'litre',
      'metre': 'mètre'
    };
    return unites[unite] || unite;
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }
}
