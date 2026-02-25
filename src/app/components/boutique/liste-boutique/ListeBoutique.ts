import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ProfilService, Boutique } from '../../../services/boutique/profil/profil.service';
import { Note, NoteResponse, MaNoteResponse } from '../../../services/boutique/note/note.service';
import { Favoris } from '../../../services/acheteur/favoris/favoris.service';
import { AuthService } from '../../../services/auth';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-liste-boutique',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './ListeBoutique.html',
  styleUrls: ['./liste-boutique.css']
})
export class ListeBoutique implements OnInit, OnDestroy {
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
  sortBy: 'nom' | 'note' | 'date' = 'date';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Catégories disponibles
  categories: string[] = [];

  // Statistiques
  stats = {
    total: 0,
    actives: 0,
    inactives: 0
  };

  // État de notation pour chaque boutique
  ratingInProgress: Set<string> = new Set();

  // État des favoris pour chaque boutique
  favoritesInProgress: Set<string> = new Set();

  // Utilisateur connecté
  currentUser: any = null;
  private authSubscription: Subscription | null = null;

  // Gestion des favoris
  private favorites: Set<string> = new Set();

  constructor(
    private profilService: ProfilService,
    private noteService: Note,
    private favorisService: Favoris,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // S'abonner aux changements de l'utilisateur connecté
    this.authSubscription = this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
      // Recharger les boutiques quand l'utilisateur change
      this.loadBoutiques();
    });
  }

  ngOnDestroy(): void {
    // Se désabonner pour éviter les fuites mémoire
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  async loadBoutiques(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      const response = await this.profilService.getAllBoutiques().toPromise();

      // Vérifier que response existe et a la propriété success
      if (response && 'success' in response && response.success) {
        // Filtrer les boutiques actives
        this.boutiques = (response.boutiques || []).filter((b: Boutique) => b?.active === true);

        // Charger les notes de l'utilisateur pour chaque boutique (si connecté)
        if (this.currentUser) {
          await this.loadUserNotesForBoutiques();
          await this.loadFavoritesForBoutiques();
        }

        this.totalItems = this.boutiques.length;
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);

        this.calculateStats();
        this.extractCategories();
        this.applyFilters();
      } else {
        this.error = 'Format de réponse invalide';
      }
    } catch (err) {
      console.error('Erreur lors du chargement des boutiques:', err);
      this.error = 'Impossible de charger la liste des boutiques';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async loadUserNotesForBoutiques(): Promise<void> {
    if (!this.currentUser || this.boutiques.length === 0) return;

    // Charger la note de l'utilisateur pour chaque boutique
    const promises = this.boutiques.map(async (boutique) => {
      if (boutique._id) {
        try {
          const response = await this.noteService.getMaNote('BOUTIQUE', boutique._id).toPromise();
          if (response && 'a_note' in response) {
            if (response.a_note && response.note !== null && response.note !== undefined) {
              boutique.userNote = response.note;
            } else {
              boutique.userNote = undefined;
            }
          }
        } catch (error) {
          console.error(`Erreur chargement note boutique ${boutique._id}:`, error);
          boutique.userNote = undefined;
        }
      }
    });

    await Promise.all(promises);
  }

  async loadFavoritesForBoutiques(): Promise<void> {
    if (!this.currentUser || this.boutiques.length === 0) return;

    const promises = this.boutiques.map(async (boutique) => {
      if (boutique._id) {
        try {
          const response = await this.favorisService.checkBoutiqueFavoris(boutique._id).toPromise();
          boutique.estFavoris = response?.estFavoris || false;
        } catch (error) {
          console.error(`Erreur chargement favoris boutique ${boutique._id}:`, error);
          boutique.estFavoris = false;
        }
      }
    });

    await Promise.all(promises);
  }

  calculateStats(): void {
    this.stats = {
      total: this.boutiques.length,
      actives: this.boutiques.filter(b => b?.active).length,
      inactives: this.boutiques.filter(b => !b?.active).length
    };
  }

  extractCategories(): void {
    const categorySet = new Set<string>();
    this.boutiques.forEach(boutique => {
      boutique.categories?.forEach(cat => {
        if (cat?.valide && cat?.nom) {
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
        (b.nom?.toLowerCase().includes(term)) ||
        (b.slogan?.toLowerCase().includes(term)) ||
        (b.description?.toLowerCase().includes(term))
      );
    }

    // Filtre par catégorie
    if (this.selectedCategory) {
      filtered = filtered.filter(b =>
        b.categories?.some(cat => cat?.nom === this.selectedCategory && cat?.valide)
      );
    }

    // Tri
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (this.sortBy) {
        case 'nom':
          comparison = (a.nom || '').localeCompare(b.nom || '');
          break;
        case 'note':
          // Priorité à la note moyenne de la boutique
          const noteA = a.note_moyenne || 0;
          const noteB = b.note_moyenne || 0;
          comparison = noteB - noteA;
          break;
        case 'date':
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          comparison = dateB - dateA;
          break;
      }

      return this.sortOrder === 'asc' ? -comparison : comparison;
    });

    this.filteredBoutiques = filtered;
    this.totalItems = filtered.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    this.currentPage = 1;
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
    if (typeof boutique.box === 'object' && boutique.box.numero && boutique.box.surface) {
      return `Box ${boutique.box.numero} - ${boutique.box.surface}m²`;
    }
    return 'Box assigné';
  }

  getFirstContact(boutique: Boutique): string {
    if (!boutique.contact || boutique.contact.length === 0) {
      return 'Aucun contact';
    }
    const contact = boutique.contact[0];
    return contact?.length > 20 ? contact.substring(0, 20) + '...' : contact || 'Contact';
  }

  getCategoryNames(boutique: Boutique): string[] {
    return boutique.categories
      ?.filter(cat => cat?.valide)
      .map(cat => cat?.nom)
      .filter((nom): nom is string => !!nom) || [];
  }

  // Gestion des notes avec le vrai service
  async rateBoutique(boutique: Boutique, note: number): Promise<void> {
    if (!boutique._id) return;

    // Vérifier si l'utilisateur est connecté
    if (!this.currentUser) {
      this.redirectToLogin();
      return;
    }

    // Empêcher les clics multiples
    if (this.ratingInProgress.has(boutique._id)) return;
    this.ratingInProgress.add(boutique._id);

    try {
      const response = await this.noteService.noterBoutique(boutique._id, note).toPromise();

      if (response) {
        // Mettre à jour la note utilisateur (pour l'affichage des étoiles)
        boutique.userNote = note;

        // Mettre à jour la note moyenne avec celle retournée par le serveur
        if (response.statistiques?.moyenne !== undefined) {
          boutique.note_moyenne = response.statistiques.moyenne;
        }

        console.log(response.message || 'Note enregistrée');

        // Forcer la détection de changements
        this.cdr.detectChanges();

        // Réappliquer les filtres pour le tri
        this.applyFilters();
      }
    } catch (error: any) {
      console.error('Erreur lors de la notation:', error);

      // Gérer les erreurs spécifiques
      if (error.status === 401) {
        this.redirectToLogin();
      } else {
        alert(error.error?.message || 'Erreur lors de la notation');
      }
    } finally {
      this.ratingInProgress.delete(boutique._id);
      // 👇 FORCER LA DÉTECTION APRÈS LA MISE À JOUR
      this.cdr.detectChanges();
    }
  }

  redirectToLogin(): void {
    // Sauvegarder l'URL actuelle pour rediriger après connexion
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    window.location.href = '/login';
  }

  // Gestion des favoris
  // Gestion des favoris
  async toggleFavorite(boutique: Boutique): Promise<void> {
    if (!boutique._id) return;

    if (!this.currentUser) {
      this.redirectToLogin();
      return;
    }

    if (this.favoritesInProgress.has(boutique._id)) return;
    this.favoritesInProgress.add(boutique._id);

    // Sauvegarder l'état précédent pour restauration en cas d'erreur
    const etatPrecedent = boutique.estFavoris;

    // Mise à jour optimiste de l'UI
    boutique.estFavoris = !boutique.estFavoris;

    try {
      const response = await this.favorisService.toggleBoutiqueFavoris(boutique._id).toPromise();

      if (response?.success) {
        console.log(response.message);
        // L'état est déjà mis à jour, on garde la valeur actuelle
      } else {
        // Restaurer l'état précédent en cas d'échec
        boutique.estFavoris = etatPrecedent;
      }
    } catch (error: any) {
      console.error('Erreur lors de la modification des favoris:', error);
      // Restaurer l'état précédent
      boutique.estFavoris = etatPrecedent;

      if (error.status === 401) {
        this.redirectToLogin();
      } else {
        alert(error.error?.message || 'Erreur lors de la modification des favoris');
      }
    } finally {
      this.favoritesInProgress.delete(boutique._id);
      this.cdr.detectChanges();
    }
  }

  isFavorite(boutique: Boutique): boolean {
    return boutique.estFavoris || false;
  }

  isFavoriteInProgress(boutiqueId: string | undefined): boolean {
    return boutiqueId ? this.favoritesInProgress.has(boutiqueId) : false;
  }

  Math = Math;
}
