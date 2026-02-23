// components/boutique/produits/produits.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, FormArray } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModal, NgbModule, NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Categorie } from '../../../services/boutique/profil/profil.service';
import { ProduitService, Produit, ProduitInput, StockUpdate } from '../../../services/boutique/produit/produit.service';
import { CategorieService } from '../../../services/admin/categorie/categorie.service';
import { BoutiqueContextService } from '../../../services/boutique/context/boutique.context.service';
import { AuthService } from '../../../services/auth';
import { ToastService } from '../../../services/utils/toast/toast.service';
import { Router } from '@angular/router';
import { PromotionService, Promotion, CreatePromotionData, UpdatePromotionData } from '../../../services/boutique/promotion/promotion.service';
import { PromotionModalComponent, PromotionModalData } from '../promotion/promotion-modal.component';

@Component({
  selector: 'app-produits',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    NgbModule,
    NgbPaginationModule,
    PromotionModalComponent
  ],
  templateUrl: './produit.component.html',
  styleUrls: ['./produit.component.css']
})
export class ProduitsComponent implements OnInit, OnDestroy {
  // ===== ÉTATS =====
  loading = false;
  isModalOpen = false;
  isEditing = false;
  selectedProduit: Produit | null = null;
  currentUser: any = null;
  
  // ===== DONNÉES =====
  produits: Produit[] = [];
  categories: Categorie[] = [];
  filteredCategories: Categorie[] = [];
  promotions: Promotion[] = [];
  produitsWithPromo: Set<string> = new Set(); // IDs des produits avec promo active
  
  // ===== PAGINATION =====
  currentPage = 1;
  itemsPerPage = 20;
  totalItems = 0;
  totalPages = 1;
  
  // ===== FILTRES =====
  searchTerm = '';
  selectedCategorie = '';
  showActifOnly = true;
  showPromoOnly = false;
  
  // ===== FORMULAIRES =====
  produitForm: FormGroup;
  stockForm: FormGroup;
  
  // ===== IMAGES =====
  imagePreviews: string[] = [];
  selectedFiles: File[] = [];
  uploadingImage = false;
  
  // ===== SUBSCRIPTIONS =====
  private subscriptions: Subscription[] = [];
  private searchSubject = new Subject<string>();

  @ViewChild('produitModal') produitModal: any;
  @ViewChild('stockModal') stockModal: any;
  @ViewChild('deleteModal') deleteModal: any;
  @ViewChild('promotionListModal') promotionListModal: any;

  constructor(
    private fb: FormBuilder,
    private produitService: ProduitService,
    private categorieService: CategorieService,
    private boutiqueContext: BoutiqueContextService,
    private promotionService: PromotionService,
    private authService: AuthService,
    private modalService: NgbModal,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    this.produitForm = this.createProduitForm();
    this.stockForm = this.createStockForm();
  }

  async ngOnInit(): Promise<void> {
    if (!this.authService.isBrowser()) {
      return;
    }
    
    await this.authService.initializeAuth();
    
    if (!this.authService.isLoggedIn()) {
      console.log('🔒 Non authentifié - Redirection immédiate vers login');
      this.router.navigate(['/login']);
      return;
    }

    setTimeout(() => {
      this.subscriptions.push(
        this.boutiqueContext.boutiqueSelectionnee$.pipe(
          distinctUntilChanged((a: any, b: any) => a?._id === b?._id)
        ).subscribe(boutique => {
          if (boutique) {
            console.log('🏪 Boutique sélectionnée:', boutique.nom);
            this.loadCategories();
            this.loadProduits();
            this.loadPromotions();
          } else {
            console.warn('⚠️ Aucune boutique sélectionnée');
            this.loading = false;
            this.cdr.detectChanges();
          }
        })
      );
    });

    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private createProduitForm(): FormGroup {
    return this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', Validators.maxLength(1000)],
      prix: ['', [Validators.required, Validators.min(0), Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
      unite: ['unite', Validators.required],
      stock: [0, [Validators.min(0), Validators.pattern(/^\d+$/)]],
      categorie: ['', Validators.required],
      actif: [true]
    });
  }

  private createStockForm(): FormGroup {
    return this.fb.group({
      quantite: ['', [Validators.required, Validators.min(1)]],
      operation: ['ADD', Validators.required]
    });
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1;
      this.loadProduits();
    });
  }

  // ===== CHARGEMENT DES DONNÉES =====
  loadCategories(): void {
    this.categorieService.getCategoriesValides().subscribe({
      next: (response) => {
        this.categories = response.categories || [];
        this.filteredCategories = this.categories;
        console.log('📚 Catégories chargées:', this.categories.length);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur chargement catégories:', error);
        this.toastService.show('Erreur chargement catégories', 'error');
      }
    });
  }

  loadPromotions(): void {
    this.promotionService.getPromotions().subscribe({
      next: (promotions) => {
        this.promotions = promotions;
        this.updateProduitsWithPromo();
        console.log('🏷️ Promotions chargées:', this.promotions.length);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur chargement promotions:', error);
      }
    });
  }

  updateProduitsWithPromo(): void {
    this.produitsWithPromo.clear();
    this.promotions.forEach(promo => {
      if (Array.isArray(promo.produits)) {
        promo.produits.forEach(prod => {
          const prodId = typeof prod === 'string' ? prod : prod._id;
          if (prodId) {
            this.produitsWithPromo.add(prodId);
          }
        });
      }
    });
  }

  loadProduits(): void {
    const boutique = this.boutiqueContext.getBoutiqueSelectionnee();
    if (!boutique) {
      this.toastService.show('Aucune boutique sélectionnée', 'warning');
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    const params: any = {
      page: this.currentPage,
      limit: this.itemsPerPage
    };

    if (this.showActifOnly) {
      params.actif = true;
    }

    if (this.selectedCategorie) {
      params.categorie = this.selectedCategorie;
    }

    if (this.searchTerm) {
      params.search = this.searchTerm;
    }

    this.produitService.getProduits(params).subscribe({
      next: (response) => {
        let produits = response.produits;
        
        // Appliquer le filtre promo uniquement si nécessaire
        if (this.showPromoOnly) {
          produits = produits.filter(p => 
            this.produitsWithPromo.has(p._id)
          );
        }

        this.produits = produits;
        this.totalItems = response.total;
        this.totalPages = response.totalPages;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur chargement produits:', error);
        this.toastService.show('Erreur lors du chargement des produits', 'error');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ===== RECHERCHE ET FILTRES =====
  onSearchChange(term: string): void {
    this.searchTerm = term;
    this.searchSubject.next(term);
  }

  filterByCategorie(categorieId: string): void {
    this.selectedCategorie = categorieId;
    this.currentPage = 1;
    this.loadProduits();
  }

  onActifFilterChange(value: boolean): void {
    this.showActifOnly = value;
    this.currentPage = 1;
    this.loadProduits();
  }

  onPromoFilterChange(value: boolean): void {
    this.showPromoOnly = value;
    this.currentPage = 1;
    this.loadProduits();
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategorie = '';
    this.showActifOnly = true;
    this.showPromoOnly = false;
    this.currentPage = 1;
    this.loadProduits();
  }

  // ===== GESTION DES PROMOTIONS =====
  openCreatePromotionModal(): void {
    const modalData: PromotionModalData = {
      produits: this.produits,
      isEditing: false
    };

    const modalRef = this.modalService.open(PromotionModalComponent, {
      size: 'lg',
      backdrop: 'static'
    });

    modalRef.componentInstance.data = modalData;
    
    modalRef.componentInstance.savePromotion.subscribe((promotionData: any) => {
      this.createPromotion(promotionData);
    });

    modalRef.componentInstance.closeModal.subscribe(() => {
      modalRef.close();
    });
  }

  openEditPromotionModal(promotion: Promotion): void {
    const modalData: PromotionModalData = {
      produits: this.produits,
      isEditing: true,
      promotion: promotion
    };

    const modalRef = this.modalService.open(PromotionModalComponent, {
      size: 'lg',
      backdrop: 'static'
    });

    modalRef.componentInstance.data = modalData;
    
    modalRef.componentInstance.savePromotion.subscribe((promotionData: any) => {
      this.updatePromotion(promotion._id, promotionData);
    });

    modalRef.componentInstance.closeModal.subscribe(() => {
      modalRef.close();
    });
  }

  openPromotionListModal(): void {
    this.loadPromotions(); // Recharger les promotions
    this.modalService.open(this.promotionListModal, { size: 'lg' });
  }

  private createPromotion(promotionData: any): void {
    // Vérifier si des produits sont déjà en promotion
    const produitsDejaEnPromo = promotionData.produits.filter((id: string) => 
      this.produitsWithPromo.has(id)
    );

    if (produitsDejaEnPromo.length > 0) {
      const nomsProduits = this.produits
        .filter(p => produitsDejaEnPromo.includes(p._id))
        .map(p => p.nom)
        .join(', ');
      
      this.toastService.show(
        `Certains produits sont déjà en promotion: ${nomsProduits}. Veuillez les retirer.`,
        'warning'
      );
      return;
    }

    this.promotionService.createPromotion(promotionData).subscribe({
      next: () => {
        this.toastService.show('Promotion créée avec succès', 'success');
        this.loadPromotions();
        this.loadProduits();
      },
      error: (error) => {
        console.error('❌ Erreur création promotion:', error);
        this.toastService.show(error.error?.message || 'Erreur création promotion', 'error');
      }
    });
  }

  private updatePromotion(id: string, promotionData: any): void {
    const updateData: UpdatePromotionData = {
      reduction: promotionData.reduction,
      date_debut: promotionData.date_debut,
      date_fin: promotionData.date_fin
    };

    this.promotionService.updatePromotion(id, updateData).subscribe({
      next: () => {
        this.toastService.show('Promotion mise à jour avec succès', 'success');
        this.loadPromotions();
        this.loadProduits();
      },
      error: (error) => {
        console.error('❌ Erreur mise à jour promotion:', error);
        this.toastService.show(error.error?.message || 'Erreur mise à jour promotion', 'error');
      }
    });
  }

  deletePromotion(promotion: Promotion, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    if (confirm('Êtes-vous sûr de vouloir supprimer cette promotion ?')) {
      this.promotionService.deletePromotion(promotion._id).subscribe({
        next: () => {
          this.toastService.show('Promotion supprimée avec succès', 'success');
          this.loadPromotions();
          this.loadProduits();
          this.modalService.dismissAll();
        },
        error: (error) => {
          console.error('❌ Erreur suppression promotion:', error);
          this.toastService.show(error.error?.message || 'Erreur suppression promotion', 'error');
        }
      });
    }
  }

  getProduitPromotion(produitId: string): Promotion | null {
    for (const promo of this.promotions) {
      if (Array.isArray(promo.produits)) {
        const hasProduit = promo.produits.some(prod => 
          (typeof prod === 'string' && prod === produitId) ||
          (prod && prod._id === produitId)
        );
        if (hasProduit) {
          return promo;
        }
      }
    }
    return null;
  }

  getProduitPromotionReduction(produitId: string): number | null {
    const promo = this.getProduitPromotion(produitId);
    return promo ? promo.reduction : null;
  }

  getPromotionStatus(promotion: Promotion): string {
    const now = new Date();
    const debut = promotion.date_debut ? new Date(promotion.date_debut) : null;
    const fin = promotion.date_fin ? new Date(promotion.date_fin) : null;

    if (debut && debut > now) {
      return 'À venir';
    } else if (fin && fin < now) {
      return 'Expirée';
    } else if (!debut && !fin) {
      return 'Permanente';
    } else if (!debut && fin && fin >= now) {
      return 'Active (jusqu\'au ' + this.formatDate(fin) + ')';
    } else if (debut && debut <= now && !fin) {
      return 'Active (permanente)';
    } else if (debut && debut <= now && fin && fin >= now) {
      return 'Active';
    }
    
    return 'Programmée';
  }

  getPromotionBadgeClass(promotion: Promotion): string {
    const status = this.getPromotionStatus(promotion);
    if (status.includes('Active')) {
      return 'bg-success';
    } else if (status.includes('À venir')) {
      return 'bg-warning';
    } else if (status.includes('Expirée')) {
      return 'bg-secondary';
    } else {
      return 'bg-info';
    }
  }

  // ===== GESTION DES PRODUITS =====
  openCreateModal(): void {
    this.isEditing = false;
    this.selectedProduit = null;
    this.produitForm.reset({
      unite: 'unite',
      stock: 0,
      actif: true
    });
    this.imagePreviews = [];
    this.selectedFiles = [];
    
    this.modalService.open(this.produitModal, { size: 'lg', backdrop: 'static' });
  }

  openEditModal(produit: Produit): void {
    this.isEditing = true;
    this.selectedProduit = produit;
    
    this.produitForm.patchValue({
      nom: produit.nom,
      description: produit.description || '',
      prix: produit.prix,
      unite: produit.unite,
      stock: produit.stock,
      categorie: typeof produit.categorie === 'string' ? produit.categorie : produit.categorie._id,
      actif: produit.actif
    });
    
    this.imagePreviews = produit.images || [];
    this.selectedFiles = [];
    
    this.modalService.open(this.produitModal, { size: 'lg', backdrop: 'static' });
  }

  openStockModal(produit: Produit): void {
    this.selectedProduit = produit;
    this.stockForm.reset({ operation: 'ADD' });
    
    this.modalService.open(this.stockModal, { size: 'md' });
  }

  confirmDelete(produit: Produit): void {
    this.selectedProduit = produit;
    this.modalService.open(this.deleteModal, { size: 'md' });
  }

  // ===== GESTION DES IMAGES =====
  onImagesSelected(event: any): void {
    const files = Array.from(event.target.files) as File[];
    
    files.forEach(file => {
      if (this.isValidImage(file)) {
        this.selectedFiles.push(file);
        
        const reader = new FileReader();
        reader.onload = () => {
          this.imagePreviews.push(reader.result as string);
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      } else {
        this.toastService.show(`Format invalide: ${file.name}`, 'warning');
      }
    });
  }

  private isValidImage(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;
    return validTypes.includes(file.type) && file.size <= maxSize;
  }

  removeImage(index: number): void {
    this.imagePreviews.splice(index, 1);
    this.selectedFiles.splice(index, 1);
    this.cdr.detectChanges();
  }

  // ===== SAUVEGARDE =====
  saveProduit(): void {
    if (this.produitForm.invalid) {
      this.markFormGroupTouched(this.produitForm);
      this.toastService.show('Veuillez remplir tous les champs requis', 'warning');
      return;
    }

    const boutique = this.boutiqueContext.getBoutiqueSelectionnee();
    if (!boutique) {
      this.toastService.show('Aucune boutique sélectionnée', 'error');
      return;
    }

    this.uploadingImage = true;
    const formValue = this.produitForm.value;
    const produitData: ProduitInput = {
      nom: formValue.nom,
      description: formValue.description,
      prix: parseFloat(formValue.prix),
      unite: formValue.unite,
      stock: parseInt(formValue.stock) || 0,
      categorie: formValue.categorie,
      actif: formValue.actif
    };

    if (this.isEditing && this.selectedProduit) {
      this.produitService.updateProduit(this.selectedProduit._id, produitData)
        .subscribe({
          next: (produit) => {
            if (this.selectedFiles.length > 0) {
              this.uploadImages(produit._id);
            } else {
              this.finishProductSave('Produit mis à jour avec succès');
            }
          },
          error: (error) => {
            this.uploadingImage = false;
            console.error('❌ Erreur mise à jour produit:', error);
            this.toastService.show(error.error?.message || 'Erreur mise à jour produit', 'error');
            this.cdr.detectChanges();
          }
        });
    } else {
      this.produitService.createProduits([produitData]).subscribe({
        next: (response) => {
          const newProduit = response.produits[0];
          if (this.selectedFiles.length > 0 && newProduit) {
            this.uploadImages(newProduit._id);
          } else {
            this.finishProductSave('Produit créé avec succès');
          }
        },
        error: (error) => {
          this.uploadingImage = false;
          console.error('❌ Erreur création produit:', error);
          this.toastService.show(error.error?.message || 'Erreur création produit', 'error');
          this.cdr.detectChanges();
        }
      });
    }
  }

  private uploadImages(produitId: string): void {
    this.produitService.uploadProductImages(produitId, this.selectedFiles).subscribe({
      next: () => {
        this.finishProductSave('Produit sauvegardé avec images');
      },
      error: (error) => {
        this.uploadingImage = false;
        this.toastService.show('Produit sauvegardé mais erreur upload images', 'warning');
        this.modalService.dismissAll();
        this.loadProduits();
        this.cdr.detectChanges();
      }
    });
  }

  private finishProductSave(message: string): void {
    this.uploadingImage = false;
    this.toastService.show(message, 'success');
    this.modalService.dismissAll();
    this.loadProduits();
  }

  updateStock(): void {
    if (this.stockForm.invalid || !this.selectedProduit) return;

    const update: StockUpdate = {
      quantite: parseInt(this.stockForm.value.quantite),
      operation: this.stockForm.value.operation
    };

    this.produitService.updateStock(this.selectedProduit._id, update).subscribe({
      next: () => {
        this.toastService.show('Stock mis à jour avec succès', 'success');
        this.modalService.dismissAll();
        this.loadProduits();
      },
      error: (error) => {
        console.error('❌ Erreur mise à jour stock:', error);
        this.toastService.show(error.error?.message || 'Erreur mise à jour stock', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  deleteProduit(): void {
    if (!this.selectedProduit) return;

    this.produitService.deleteProduit(this.selectedProduit._id).subscribe({
      next: () => {
        this.toastService.show('Produit supprimé avec succès', 'success');
        this.modalService.dismissAll();
        this.loadProduits();
      },
      error: (error) => {
        console.error('❌ Erreur suppression produit:', error);
        this.toastService.show(error.error?.message || 'Erreur suppression produit', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  // ===== UTILITAIRES =====
  getStockStatus(produit: Produit): { class: string; text: string } {
    if (produit.stock <= 0) {
      return { class: 'danger', text: 'Rupture' };
    } else if (produit.stock <= 5) {
      return { class: 'warning', text: 'Stock faible' };
    }
    return { class: 'success', text: 'Normal' };
  }

  getCategorieName(produit: Produit): string {
    if (typeof produit.categorie === 'string') {
      const cat = this.categories.find(c => c._id === produit.categorie._id);
      return cat?.nom || 'Inconnue';
    }
    return produit.categorie?.nom || 'Inconnue';
  }

  formatPrix(prix: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0
    }).format(prix);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(date));
  }

  pageChanged(page: number): void {
    this.currentPage = page;
    this.loadProduits();
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
  // Ajoutez ces méthodes dans la classe ProduitsComponent

// Ouvrir le modal de gestion des produits d'une promotion
openManagePromotionModal(promotion: Promotion): void {
  const modalData: PromotionModalData = {
    produits: this.produits,
    isEditing: true,
    promotion: promotion,
    mode: 'manage'
  };

  const modalRef = this.modalService.open(PromotionModalComponent, {
    size: 'lg',
    backdrop: 'static'
  });

  modalRef.componentInstance.data = modalData;
  
  modalRef.componentInstance.savePromotion.subscribe((promotionData: any) => {
    this.updatePromotionProducts(promotion._id, promotionData.produits);
  });

  modalRef.componentInstance.deletePromotion.subscribe((promotionId: string) => {
    this.deletePromotion({ _id: promotionId } as Promotion);
  });

  modalRef.componentInstance.closeModal.subscribe(() => {
    modalRef.close();
  });
}

// Mettre à jour les produits d'une promotion
private updatePromotionProducts(id: string, produits: string[]): void {
  // Comparer avec les produits actuels pour déterminer les ajouts/retraits
  const promotion = this.promotions.find(p => p._id === id);
  if (!promotion) return;

  const produitsActuels = new Set(
    Array.isArray(promotion.produits) 
      ? promotion.produits.map(p => typeof p === 'string' ? p : p._id)
      : []
  );
  
  const nouveauxProduits = new Set(produits);
  
  // Produits à ajouter (dans nouveaux mais pas dans actuels)
  const aAjouter = Array.from(nouveauxProduits).filter(p => !produitsActuels.has(p));
  
  // Produits à retirer (dans actuels mais pas dans nouveaux)
  const aRetirer = Array.from(produitsActuels).filter(p => !nouveauxProduits.has(p));

  if (aAjouter.length > 0) {
    this.promotionService.addProduitsToPromotion(id, { produits: aAjouter }).subscribe({
      next: () => {
        this.toastService.show(`${aAjouter.length} produit(s) ajouté(s)`, 'success');
        this.loadPromotions();
        this.loadProduits();
      },
      error: (error) => {
        console.error('❌ Erreur ajout produits:', error);
        this.toastService.show('Erreur lors de l\'ajout des produits', 'error');
      }
    });
  }

  if (aRetirer.length > 0) {
    this.promotionService.removeProduitsFromPromotion(id, { produits: aRetirer }).subscribe({
      next: () => {
        this.toastService.show(`${aRetirer.length} produit(s) retiré(s)`, 'success');
        this.loadPromotions();
        this.loadProduits();
      },
      error: (error) => {
        console.error('❌ Erreur retrait produits:', error);
        this.toastService.show('Erreur lors du retrait des produits', 'error');
      }
    });
  }

  if (aAjouter.length === 0 && aRetirer.length === 0) {
    this.toastService.show('Aucune modification détectée', 'info');
  }
}
}