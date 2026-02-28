import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, forkJoin, takeUntil } from 'rxjs';
import { RouterModule } from '@angular/router';  // ← IMPORTANT

import { ProduitService, Produit, ProduitsResponse } from '../../../services/boutique/produit/produit.service';
import { ToastService } from '../../../services/utils/toast/toast.service';
import { PanierService } from '../../../services/acheteur/panier/panier.service';
import { ActivatedRoute } from '@angular/router';
import { Boutique } from '../../../services/boutique/profil/profil.service';

import { PromotionService, Promotion } from '../../../services/boutique/promotion/promotion.service';
// Interface étendue pour inclure les infos de promo
interface ProduitWithPromo extends Produit {
  prixOriginal?: number;
  prixPromo?: number;
  reduction?: number;
  enPromotion?: boolean;
  promotionId?: string;
  dateFinPromo?: Date;
}

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

  // Données avec promotion
  produits: ProduitWithPromo[] = [];
  promotions: Promotion[] = [];
  totalProduits = 0;


  // Pagination - Style ListeBoutique
  currentPage = 1;
  itemsPerPage = 12;  // correspond à pageSize
  totalPages = 1;

  // États
  loading = false;
  loadingPromos = false;
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
    private promotionService: PromotionService,
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
    this.loadPromotionsAndProduits();

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

  /**
   * Charger les promotions et les produits en parallèle
   */
  private loadPromotionsAndProduits(): void {
    if (!this.boutiqueId) return;

    this.loading = true;
    this.loadingPromos = true;

    forkJoin({
      promotions: this.promotionService.getPromotionsActivesByBoutique(this.boutiqueId),
      produits: this.produitService.getProduitsByBoutique(this.boutiqueId, {
        page: this.currentPage,
        limit: this.itemsPerPage,
        actif: true
      })
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.promotions = results.promotions;
          this.processProduitsWithPromos(results.produits.produits);
          this.totalProduits = results.produits.total;
          this.totalPages = results.produits.totalPages;
          this.currentPage = results.produits.currentPage;
          this.loading = false;
          this.loadingPromos = false;
          this.initialLoad = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('❌ Erreur chargement données:', err);
          this.error = 'Impossible de charger les produits';
          this.loading = false;
          this.loadingPromos = false;
          this.initialLoad = false;
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Traiter les produits pour appliquer les promotions
   */
  private processProduitsWithPromos(produits: Produit[]): void {
    // Créer un map des promotions par produit pour un accès rapide
    const promoMap = new Map<string, Promotion>();

    this.promotions.forEach(promo => {
      if (promo.produits && Array.isArray(promo.produits)) {
        promo.produits.forEach(produitId => {
          // Si le produit a plusieurs promos, on prend la meilleure (réduction la plus élevée)
          const produitIdStr = typeof produitId === 'string' ? produitId : produitId._id;
          const existingPromo = promoMap.get(produitIdStr);
          if (!existingPromo || promo.reduction > existingPromo.reduction) {
            promoMap.set(produitIdStr, promo);
          }
        });
      }
    });

    // Enrichir les produits avec les infos de promotion
    this.produits = produits.map(produit => {
      const promo = promoMap.get(produit._id);

      if (promo) {
        const prixOriginal = produit.prix;
        const prixPromo = produit.prix * (1 - promo.reduction / 100);

        return {
          ...produit,
          prixOriginal,
          prixPromo,
          reduction: promo.reduction,
          enPromotion: true,
          promotionId: promo._id,
          dateFinPromo: promo.date_fin
        };
      }

      return {
        ...produit,
        enPromotion: false
      };
    });

    console.log('🏷️ Produits avec promotions:', this.produits.filter(p => p.enPromotion).length);
  }

  /**
   * Recharger les produits (après filtre ou pagination)
   */
  loadProduits(): void {
    if (!this.boutiqueId || this.loading) return;

    this.loading = true;

    const params = {
      page: this.currentPage,
      limit: this.itemsPerPage,
      search: this.filters.search || undefined,
      categorie: this.filters.categorie || undefined,
      actif: true
    };

    // Recharger les produits mais garder les promotions déjà chargées
    this.produitService.getProduitsByBoutique(this.boutiqueId, params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ProduitsResponse) => {
          this.processProduitsWithPromos(response.produits);
          this.totalProduits = response.total;
          this.totalPages = response.totalPages;
          this.currentPage = response.currentPage;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('❌ Erreur:', err);
          this.error = 'Impossible de charger les produits';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  /**
   * Formater le prix avec ou sans promotion
   */
  formatProduitPrice(produit: ProduitWithPromo): string {
    if (produit.enPromotion && produit.prixPromo) {
      return this.formatPrice(produit.prixPromo);
    }
    return this.formatPrice(produit.prix);
  }

  /**
   * Obtenir le prix original formaté (pour affichage barré)
   */
  getPrixOriginalFormatted(produit: ProduitWithPromo): string {
    if (produit.prixOriginal) {
      return this.formatPrice(produit.prixOriginal);
    }
    return '';
  }

  /**
   * Vérifier si un produit est en promotion
   */
  isEnPromotion(produit: ProduitWithPromo): boolean {
    return !!produit.enPromotion;
  }

  /**
   * Obtenir le texte de la promotion
   */
  getPromotionText(produit: ProduitWithPromo): string {
    if (produit.reduction) {
      return `-${produit.reduction}%`;
    }
    return '';
  }

  // Assure-toi de mettre à jour les types dans les méthodes existantes
  getStockLabel(produit: ProduitWithPromo): string {
    if (produit.stock <= 0) return 'Rupture de stock';
    if (produit.stock <= 5) return 'Stock très faible';
    if (produit.stock <= 10) return 'Stock faible';
    return 'En stock';
  }

  getStockClass(produit: ProduitWithPromo): string {
    if (produit.stock <= 0) return 'stock-rupture';
    if (produit.stock <= 5) return 'stock-critique';
    if (produit.stock <= 10) return 'stock-faible';
    return 'stock-normal';
  }

  canAddToCart(produit: ProduitWithPromo): boolean {
    return produit.actif && produit.stock > 0;
  }

  /**
   * Getter pour les produits paginés
   */
  get paginatedProduits(): ProduitWithPromo[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.produits.slice(start, end);
  }

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
    this.filters = { search: '', categorie: '' };
    this.currentPage = 1;
    this.loadProduits();
  }

  onPageChange(page: number): void {
    this.changePage(page);
  }

  onPageSizeChange(size: number): void {
    if (size !== this.itemsPerPage) {
      this.itemsPerPage = size;
      this.currentPage = 1;
      this.loadProduits();
    }
  }

  addToCart(produit: ProduitWithPromo): void {
    if (produit.stock <= 0) {
      this.toastService.show('Ce produit n\'est pas disponible', 'warning');
      return;
    }

    if (this.addingToCart.has(produit._id)) return;

    this.addingToCart.add(produit._id);

    this.panierService.ajouterProduit(produit._id, 1).subscribe({
      next: () => {
        this.toastService.show(`${produit.nom} ajouté au panier`, 'success');
        this.addingToCart.delete(produit._id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.toastService.show(err.message || 'Erreur ajout au panier', 'error');
        this.addingToCart.delete(produit._id);
        this.cdr.detectChanges();
      }
    });
  }

  formatPrice(prix: number): string {
    return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA',
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
