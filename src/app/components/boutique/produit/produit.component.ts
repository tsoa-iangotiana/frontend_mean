// components/boutique/produits/produits.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
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

@Component({
  selector: 'app-produits',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    NgbModule,
    NgbPaginationModule
  ],
  templateUrl: './produit.component.html',
  styleUrls: ['./produit.component.css']
})
// produits.component.ts corrigé
export class ProduitsComponent implements OnInit, OnDestroy {
  // ===== ÉTATS =====
  loading = false; // Commence à false, pas true
  isModalOpen = false;
  isEditing = false;
  selectedProduit: Produit | null = null;
  currentUser: any = null;
  
  // ===== DONNÉES =====
  produits: Produit[] = [];
  categories: Categorie[] = [];
  filteredCategories: Categorie[] = [];
  
  // ===== PAGINATION =====
  currentPage = 1;
  itemsPerPage = 20;
  totalItems = 0;
  totalPages = 1;
  
  // ===== FILTRES =====
  searchTerm = '';
  selectedCategorie = '';
  showActifOnly = true;
  
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

  constructor(
    private fb: FormBuilder,
    private produitService: ProduitService,
    private categorieService: CategorieService,
    private boutiqueContext: BoutiqueContextService,
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

    // Utiliser setTimeout pour éviter ExpressionChangedAfterItHasBeenChecked
    setTimeout(() => {
      this.subscriptions.push(
        this.boutiqueContext.boutiqueSelectionnee$.pipe(
          distinctUntilChanged((a: any, b: any) => a?._id === b?._id)
        ).subscribe(boutique => {
          if (boutique) {
            console.log('🏪 Boutique sélectionnée:', boutique.nom);
            this.loadCategories();
            this.loadProduits();
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

  loadProduits(): void {
    const boutique = this.boutiqueContext.getBoutiqueSelectionnee();
    if (!boutique) {
      this.toastService.show('Aucune boutique sélectionnée', 'warning');
      return;
    }

    this.loading = true;
    this.cdr.detectChanges(); // Force la détection immédiate

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
        this.produits = response.produits;
        this.totalItems = response.total;
        this.totalPages = response.totalPages;
        this.loading = false;
        this.cdr.detectChanges(); // Force la mise à jour de la vue
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

  toggleActifFilter(): void {
    console.log('🔄 Toggle filtre actif. Actuel:', this.showActifOnly);
    this.showActifOnly = !this.showActifOnly;
    this.currentPage = 1;
    this.loadProduits();
    // Pas besoin de cdr.detectChanges() ici car loadProduits() le fait
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedCategorie = '';
    this.showActifOnly = true;
    this.currentPage = 1;
    this.loadProduits();
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
    
    setTimeout(() => {
      this.cdr.detectChanges();
    });
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
    
    setTimeout(() => {
      this.cdr.detectChanges();
    });
  }

  openStockModal(produit: Produit): void {
    this.selectedProduit = produit;
    this.stockForm.reset({ operation: 'ADD' });
    
    this.modalService.open(this.stockModal, { size: 'md' });
    
    setTimeout(() => {
      this.cdr.detectChanges();
    });
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
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(prix);
  }

  pageChanged(page: number): void {
    this.currentPage = page;
    this.loadProduits();
  }
  
  onActifFilterChange(value: boolean): void {
  console.log('Filtre actif change ->', value);
  this.showActifOnly = value;
  this.currentPage = 1;
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
}