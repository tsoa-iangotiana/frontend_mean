// components/boutique/produits/promotion-modal.component.ts
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { NgbActiveModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';

export interface PromotionModalData {
  produits: any[];
  isEditing: boolean;
  promotion?: any;
  mode?: 'create' | 'edit' | 'manage'; // Nouveau mode pour gérer les produits
}

@Component({
  selector: 'app-promotion-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NgbModule
  ],
  template: `
    <div class="modal-header">
      <h5 class="modal-title">
        <i class="fas fa-tags me-2"></i>
        <ng-container [ngSwitch]="getModalMode()">
          <span *ngSwitchCase="'create'">Nouvelle promotion</span>
          <span *ngSwitchCase="'edit'">Modifier la promotion</span>
          <span *ngSwitchCase="'manage'">Gérer les produits de la promotion</span>
          <span *ngSwitchDefault>{{ isEditing ? 'Modifier la promotion' : 'Nouvelle promotion' }}</span>
        </ng-container>
      </h5>
      <button type="button" class="btn-close" aria-label="Close" (click)="close()"></button>
    </div>

    <div class="modal-body">
      <form [formGroup]="promotionForm">
        <!-- Sélection des produits (toujours visible) -->
        <div class="mb-3">
          <label class="form-label fw-bold">
            Produits concernés
            <span class="text-danger">*</span>
            <span class="badge bg-info ms-2">{{ produitsSelectionnes.size }} sélectionné(s)</span>
          </label>

          <!-- Barre de recherche rapide -->
          <div class="input-group mb-2">
            <span class="input-group-text"><i class="fas fa-search"></i></span>
            <input
              type="text"
              class="form-control"
              placeholder="Rechercher un produit..."
              [(ngModel)]="searchTerm"
              (ngModelChange)="filterProduits()"
              [ngModelOptions]="{standalone: true}">
          </div>

          <div class="produits-selection border rounded p-3" style="max-height: 250px; overflow-y: auto;">
            <div class="form-check" *ngFor="let produit of filteredProduits">
              <input
                class="form-check-input"
                type="checkbox"
                [id]="'prod_' + produit._id"
                [checked]="isProduitSelected(produit._id)"
                (change)="toggleProduitSelection(produit._id)">
              <label class="form-check-label d-flex justify-content-between align-items-center" [for]="'prod_' + produit._id">
                <span>
                  {{ produit.nom }}
                  <small class="text-muted ms-2">({{ produit.categorie?.nom || 'Sans catégorie' }})</small>
                </span>
                <span>
                  <small class="text-muted me-2">{{ formatPrix(produit.prix) }}</small>
                  <span class="badge" [ngClass]="produit.actif ? 'bg-success' : 'bg-secondary'">
                    {{ produit.actif ? 'Actif' : 'Inactif' }}
                  </span>
                </span>
              </label>
            </div>
            <div class="text-center py-3" *ngIf="filteredProduits.length === 0">
              <i class="fas fa-box-open text-muted"></i>
              <p class="text-muted mt-2">Aucun produit trouvé</p>
            </div>
          </div>

          <!-- Boutons de sélection rapide -->
          <div class="mt-2 d-flex gap-2 flex-wrap">
            <button type="button" class="btn btn-sm btn-outline-secondary" (click)="selectAllProduits()">
              <i class="fas fa-check-double me-1"></i>Tout sélectionner
            </button>
            <button type="button" class="btn btn-sm btn-outline-secondary" (click)="deselectAllProduits()">
              <i class="fas fa-times me-1"></i>Tout désélectionner
            </button>
            <button type="button" class="btn btn-sm btn-outline-info" (click)="selectActiveOnly()">
              <i class="fas fa-check-circle me-1"></i>Produits actifs
            </button>
          </div>

          <div class="text-danger small mt-1" *ngIf="produitsSelectionnes.size === 0 && formSubmitted">
            Sélectionnez au moins un produit
          </div>
        </div>

        <!-- Section réduction et dates (cachée en mode gestion) -->
        <ng-container *ngIf="getModalMode() !== 'manage'">
          <!-- Pourcentage de réduction -->
          <div class="mb-3">
            <label class="form-label">Pourcentage de réduction <span class="text-danger">*</span></label>
            <div class="input-group">
              <input
                type="number"
                class="form-control"
                [class.is-invalid]="promotionForm.get('reduction')?.invalid && (promotionForm.get('reduction')?.touched || formSubmitted)"
                formControlName="reduction"
                min="1"
                max="100">
              <span class="input-group-text">%</span>
            </div>
            <div class="invalid-feedback" *ngIf="promotionForm.get('reduction')?.errors?.['required']">
              La réduction est requise
            </div>
            <div class="invalid-feedback" *ngIf="promotionForm.get('reduction')?.errors?.['min']">
              Minimum 1%
            </div>
            <div class="invalid-feedback" *ngIf="promotionForm.get('reduction')?.errors?.['max']">
              Maximum 100%
            </div>
          </div>

          <div class="row">
            <!-- Date de début (optionnelle) -->
            <div class="col-md-6 mb-3">
              <label class="form-label">Date de début</label>
              <input
                type="date"
                class="form-control"
                formControlName="date_debut">
            </div>

            <!-- Date de fin (optionnelle) -->
            <div class="col-md-6 mb-3">
              <label class="form-label">Date de fin</label>
              <input
                type="date"
                class="form-control"
                formControlName="date_fin">
            </div>
          </div>
        </ng-container>

        <!-- Aperçu (uniquement si réduction définie) -->
        <div class="alert alert-info" *ngIf="produitsSelectionnes.size > 0 && promotionForm.get('reduction')?.value">
          <i class="fas fa-info-circle me-2"></i>
          <strong>Aperçu:</strong>
          <ul class="mb-0 mt-1">
            <li *ngFor="let produit of getPreviewProduits()">
              {{ produit.nom }}:
              <span class="text-decoration-line-through">{{ formatPrix(produit.prix) }}</span>
              → <span class="text-success fw-bold">{{ formatPrix(produit.prixPromo) }}</span>
            </li>
            <li *ngIf="produitsSelectionnes.size > 3">
              ... et {{ produitsSelectionnes.size - 3 }} autre(s)
            </li>
          </ul>
        </div>

        <!-- Résumé de la promotion en mode gestion -->
        <div class="alert alert-secondary" *ngIf="getModalMode() === 'manage' && data.promotion">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <strong>Réduction: </strong>{{ data.promotion.reduction }}%<br>
              <strong *ngIf="data.promotion.date_debut">Du {{ formatDate(data.promotion.date_debut) }}</strong>
              <strong *ngIf="data.promotion.date_fin"> au {{ formatDate(data.promotion.date_fin) }}</strong>
              <span *ngIf="!data.promotion.date_debut && !data.promotion.date_fin">Permanente</span>
            </div>
            <span class="badge" [ngClass]="getPromotionBadgeClass(data.promotion)">
              {{ getPromotionStatus(data.promotion) }}
            </span>
          </div>
        </div>
      </form>
    </div>

    <div class="modal-footer d-flex justify-content-between">
      <div>
        <button
          *ngIf="isEditing && getModalMode() !== 'manage'"
          type="button"
          class="btn btn-outline-danger me-2"
          (click)="confirmDelete()">
          <i class="fas fa-trash me-2"></i>
          Supprimer la promotion
        </button>
      </div>
      <div>
        <button type="button" class="btn btn-secondary me-2" (click)="close()">
          <i class="fas fa-times me-2"></i>
          Annuler
        </button>
        <button
          type="button"
          class="btn btn-primary"
          (click)="save()"
          [disabled]="(promotionForm.invalid && getModalMode() !== 'manage') || produitsSelectionnes.size === 0">
          <i class="fas fa-save me-2"></i>
          <ng-container [ngSwitch]="getModalMode()">
            <span *ngSwitchCase="'manage'">Mettre à jour les produits</span>
            <span *ngSwitchDefault>{{ isEditing ? 'Mettre à jour' : 'Créer' }}</span>
          </ng-container>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .produits-selection {
      background-color: #f8f9fa;
      border-radius: 6px;
    }
    .produits-selection .form-check {
      padding: 0.5rem;
      margin: 0;
      border-bottom: 1px solid #dee2e6;
      transition: background-color 0.2s;
    }
    .produits-selection .form-check:last-child {
      border-bottom: none;
    }
    .produits-selection .form-check:hover {
      background-color: #e9ecef;
    }
    .produits-selection .form-check-label {
      width: 100%;
      cursor: pointer;
    }
    .btn-group .btn {
      border-radius: 4px !important;
    }
  `]
})
export class PromotionModalComponent implements OnInit {
  @Input() data!: PromotionModalData;
  @Output() savePromotion = new EventEmitter<any>();
  @Output() deletePromotion = new EventEmitter<string>();
  @Output() closeModal = new EventEmitter<void>();

  promotionForm: FormGroup;
  produitsSelectionnes: Set<string> = new Set();
  formSubmitted = false;
  searchTerm: string = '';
  filteredProduits: any[] = [];

  constructor(
    private fb: FormBuilder,
    public activeModal: NgbActiveModal
  ) {
    this.promotionForm = this.createForm();
  }

  ngOnInit(): void {
    this.initializeForm();
    this.filterProduits();
  }

  get produits(): any[] {
    return this.data?.produits || [];
  }

  get isEditing(): boolean {
    return this.data?.isEditing || false;
  }

  getModalMode(): string {
    return this.data?.mode || (this.isEditing ? 'edit' : 'create');
  }

  private createForm(): FormGroup {
    return this.fb.group({
      reduction: ['', [Validators.required, Validators.min(1), Validators.max(100)]],
      date_debut: [null],
      date_fin: [null]
    });
  }

  private initializeForm(): void {
    this.produitsSelectionnes.clear();
    this.formSubmitted = false;

    if (this.isEditing && this.data.promotion) {
      // Mode édition
      this.promotionForm.patchValue({
        reduction: this.data.promotion.reduction,
        date_debut: this.data.promotion.date_debut ? this.formatDateForInput(this.data.promotion.date_debut) : null,
        date_fin: this.data.promotion.date_fin ? this.formatDateForInput(this.data.promotion.date_fin) : null
      });

      // Sélectionner les produits de la promotion
      if (Array.isArray(this.data.promotion.produits)) {
        this.data.promotion.produits.forEach((prod: any) => {
          const prodId = typeof prod === 'string' ? prod : prod._id;
          this.produitsSelectionnes.add(prodId);
        });
      }
    } else {
      // Mode création
      this.promotionForm.reset({
        reduction: '',
        date_debut: null,
        date_fin: null
      });
    }
  }

  filterProduits(): void {
    if (!this.searchTerm) {
      this.filteredProduits = this.produits;
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredProduits = this.produits.filter(p =>
        p.nom.toLowerCase().includes(term) ||
        (p.categorie?.nom && p.categorie.nom.toLowerCase().includes(term))
      );
    }
  }

  isProduitSelected(produitId: string): boolean {
    return this.produitsSelectionnes.has(produitId);
  }

  toggleProduitSelection(produitId: string): void {
    if (this.produitsSelectionnes.has(produitId)) {
      this.produitsSelectionnes.delete(produitId);
    } else {
      this.produitsSelectionnes.add(produitId);
    }
  }

  selectAllProduits(): void {
    this.produits.forEach(p => this.produitsSelectionnes.add(p._id));
  }

  deselectAllProduits(): void {
    this.produitsSelectionnes.clear();
  }

  selectActiveOnly(): void {
    this.produits
      .filter(p => p.actif)
      .forEach(p => this.produitsSelectionnes.add(p._id));
  }

  getPreviewProduits(): any[] {
    const reduction = this.promotionForm.get('reduction')?.value || 0;
    const selectedIds = Array.from(this.produitsSelectionnes);

    return selectedIds.slice(0, 3).map(id => {
      const produit = this.produits.find(p => p._id === id);
      return {
        nom: produit?.nom || 'Produit inconnu',
        prix: produit?.prix || 0,
        prixPromo: produit ? produit.prix * (1 - reduction / 100) : 0
      };
    });
  }

  formatPrix(prix: number): string {
    return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA',
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

  private formatDateForInput(date: Date | string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getPromotionStatus(promotion: any): string {
    const now = new Date();
    const debut = promotion.date_debut ? new Date(promotion.date_debut) : null;
    const fin = promotion.date_fin ? new Date(promotion.date_fin) : null;

    if (debut && debut > now) return 'À venir';
    if (fin && fin < now) return 'Expirée';
    if (!debut && !fin) return 'Permanente';
    if (debut && debut <= now && (!fin || fin >= now)) return 'Active';
    return 'Programmée';
  }

  getPromotionBadgeClass(promotion: any): string {
    const status = this.getPromotionStatus(promotion);
    if (status.includes('Active')) return 'bg-success';
    if (status.includes('À venir')) return 'bg-warning';
    if (status.includes('Expirée')) return 'bg-secondary';
    return 'bg-info';
  }

  save(): void {
    this.formSubmitted = true;

    if (this.produitsSelectionnes.size === 0) {
      return;
    }

    const formValue = this.promotionForm.value;
    const promotionData: any = {
      produits: Array.from(this.produitsSelectionnes)
    };

    // Ajouter les données de réduction seulement si pas en mode gestion
    if (this.getModalMode() !== 'manage') {
      if (this.promotionForm.invalid) {
        Object.keys(this.promotionForm.controls).forEach(key => {
          this.promotionForm.get(key)?.markAsTouched();
        });
        return;
      }
      promotionData.reduction = formValue.reduction;
      promotionData.date_debut = formValue.date_debut ? new Date(formValue.date_debut) : null;
      promotionData.date_fin = formValue.date_fin ? new Date(formValue.date_fin) : null;
    }

    this.savePromotion.emit(promotionData);
    this.close();
  }

  confirmDelete(): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette promotion ?')) {
      this.deletePromotion.emit(this.data.promotion._id);
      this.close();
    }
  }

  close(): void {
    this.closeModal.emit();
    this.activeModal.dismiss();
  }
}
