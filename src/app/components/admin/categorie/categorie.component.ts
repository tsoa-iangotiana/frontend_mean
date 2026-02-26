import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// ✅ Categorie ET CategoriePayload viennent du MÊME service
import { CategorieService , CategoriePayload } from '../../../services/admin/categorie/categorie.service';
import { Categorie } from '../../../services/boutique/profil/profil.service';
type ViewMode = 'all' | 'valides';
type ModalMode = 'create' | 'edit' | 'multiple' | null;

@Component({
  selector: 'app-categorie-management',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  providers: [CategorieService],
  templateUrl: './categorie.component.html',
  styleUrls: ['./categorie.component.css']
})
export class CategorieComponent implements OnInit {

  // ─── Données ───────────────────────────────────────────────────────────────
  categories: Categorie[] = [];
  filteredCategories: Categorie[] = [];

  // ─── États ─────────────────────────────────────────────────────────────────
  loading      = false;
  saving       = false;
  viewMode: ViewMode = 'all';
  searchQuery  = '';
  notification: { type: 'success' | 'error'; message: string } | null = null;

  // ─── Modal ─────────────────────────────────────────────────────────────────
  modalMode: ModalMode = null;

  // Formulaire création / édition unique
  form: CategoriePayload & { _id?: string } = { nom: '', valide: false };
  formErrors: { nom?: string } = {};

  // Formulaire insertion multiple
  multipleRaw   = '[\n  { "nom": "Exemple", "valide": true }\n]';
  multipleError = '';

  // Confirmation suppression
  deleteTarget: Categorie | null = null;

  constructor(private categorieService: CategorieService,private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadCategories();
  }

  // ─── Chargement ────────────────────────────────────────────────────────────

loadCategories(): void {
  this.loading = true;

  const obs = this.viewMode === 'valides'
    ? this.categorieService.getCategoriesValides()
    : this.categorieService.getAll();

  obs.subscribe({
    next: (data) => {
      console.log('Données reçues:', data);
      
      // ✅ Détection automatique du format de réponse
      if (Array.isArray(data)) {
        // Cas 1 : getAll() retourne directement un tableau
        this.categories = data;
      } else if (data && data.categories && Array.isArray(data.categories)) {
        // Cas 2 : getCategoriesValides() retourne { categories: [...] }
        this.categories = data.categories;
      } else {
        // Cas 3 : format inattendu
        console.warn('Format de données inattendu:', data);
        this.categories = [];
      }
      
      // ✅ Appliquer la recherche APRÈS avoir assigné
      this.applySearch();
      this.cdr.markForCheck();
      this.loading = false;
    },
    error: (err) => {
      console.error('Erreur chargement:', err);
      this.showNotification('error', 'Erreur lors du chargement des catégories');
      this.categories = [];
      this.filteredCategories = [];
      this.loading = false;
    }
  });
}
  switchView(mode: ViewMode): void {
    this.viewMode    = mode;
    this.searchQuery = '';
    this.loadCategories();
  }

  // ─── Recherche ─────────────────────────────────────────────────────────────

applySearch(): void {
  // ✅ Vérification que categories est bien un tableau
  if (!Array.isArray(this.categories)) {
    console.warn('categories n\'est pas un tableau:', this.categories);
    this.filteredCategories = [];
    return;
  }
  
  const q = this.searchQuery.toLowerCase().trim();
  this.filteredCategories = q
    ? this.categories.filter(c => c && c.nom && c.nom.toLowerCase().includes(q))
    : [...this.categories];
}

  // ─── Modals ────────────────────────────────────────────────────────────────

  openCreateModal(): void {
    this.form       = { nom: '', valide: false };
    this.formErrors = {};
    this.modalMode  = 'create';   // ✅ doit être 'create' exactement
  }

  openEditModal(cat: Categorie): void {
    this.form       = { _id: cat._id, nom: cat.nom, valide: cat.valide };
    this.formErrors = {};
    this.modalMode  = 'edit';     // ✅ doit être 'edit' exactement
  }

  openMultipleModal(): void {
    this.multipleRaw   = '[\n  { "nom": "Exemple", "valide": true }\n]';
    this.multipleError = '';
    this.modalMode     = 'multiple'; // ✅ doit être 'multiple' exactement
  }

  closeModal(): void {
    this.modalMode = null;
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  saveForm(): void {
    this.formErrors = {};

    if (!this.form.nom?.trim()) {
      this.formErrors.nom = 'Le nom est requis';
      return;
    }

    this.saving = true;
    const payload: CategoriePayload = {
      nom:    this.form.nom.trim(),
      valide: this.form.valide
    };

    const currentMode = this.modalMode; // snapshot avant fermeture async

    const obs = currentMode === 'edit' && this.form._id
      ? this.categorieService.update(this.form._id, payload)
      : this.categorieService.create(payload);

    obs.subscribe({
      next: (saved) => {
        if (currentMode === 'edit') {
          const idx = this.categories.findIndex(c => c._id === saved._id);
          if (idx !== -1) this.categories[idx] = saved;
        } else {
          this.categories.unshift(saved);
        }
        this.applySearch();
        this.closeModal();
        this.showNotification('success',
          currentMode === 'edit' ? 'Catégorie mise à jour' : 'Catégorie créée');
        this.saving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.showNotification('error', err?.error?.message || 'Erreur lors de la sauvegarde');
        this.saving = false;
        this.cdr.markForCheck();

      }
    });
  }

  saveMultiple(): void {
    this.multipleError = '';
    let parsed: CategoriePayload[];

    try {
      parsed = JSON.parse(this.multipleRaw);
      if (!Array.isArray(parsed)) throw new Error('Pas un tableau');
    } catch {
      this.multipleError = 'JSON invalide. Assurez-vous d\'envoyer un tableau.';
      return;
    }

    this.saving = true;
    this.categorieService.createMultiple(parsed).subscribe({
      next: (res) => {
        this.closeModal();
        this.loadCategories();
        this.showNotification('success', res.message);
        this.saving = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        const errors: string[] = err?.error?.errors || [];
        this.multipleError = errors.length
          ? errors.join('\n')
          : (err?.error?.message || 'Erreur lors de l\'insertion multiple');
        this.saving = false;
      }
    });
  }

  confirmDelete(cat: Categorie): void {
    this.deleteTarget = cat;
    this.cdr.markForCheck();
  }

  cancelDelete(): void {
    this.deleteTarget = null;
    this.cdr.markForCheck();
  }

  doDelete(): void {
    if (!this.deleteTarget) return;
    const id = this.deleteTarget._id;
    this.deleteTarget = null;

    this.categorieService.delete(id).subscribe({
      next: () => {
        this.categories = this.categories.filter(c => c._id !== id);
        this.applySearch();
        this.showNotification('success', 'Catégorie supprimée');
        this.cdr.markForCheck();
      },
      error: () => this.showNotification('error', 'Erreur lors de la suppression')
    });
  }

  doToggle(cat: Categorie): void {
    this.categorieService.toggle(cat._id).subscribe({
      next: (updated) => {
        const idx = this.categories.findIndex(c => c._id === updated._id);
        if (idx !== -1) this.categories[idx] = updated;
        if (this.viewMode === 'valides' && !updated.valide) {
          this.categories = this.categories.filter(c => c._id !== updated._id);
        }
        this.applySearch();
        this.showNotification('success',
          updated.valide ? 'Catégorie activée' : 'Catégorie désactivée');
          this.cdr.markForCheck();
      },
      error: () => this.showNotification('error', 'Erreur lors du changement de statut')
    });
  }

  // ─── Notification ──────────────────────────────────────────────────────────

  private showNotification(type: 'success' | 'error', message: string): void {
    this.notification = { type, message };
    setTimeout(() => { this.notification = null; }, 3500);
    this.cdr.markForCheck();
  }
}