import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth';
import { Subscription } from 'rxjs';
import { Boutique, ProfilService } from '../../services/boutique/profil/profil.service';
import { BoutiqueContextService } from '../../services/boutique/context/boutique.context.service';

interface NavItem {
  label: string;
  route?: string;
  icon: string;
  children?: NavItem[];
  exact: boolean;
  badge?: number | null;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
  imports: [CommonModule, RouterModule, NgbModule],
})
export class NavbarComponent implements OnInit, OnDestroy {
  // ===== INPUTS =====
  @Input() pageTitle: string = 'Centre Commercial';

  // ===== ÉTATS SIDEBAR ET MOBILE =====
  isSidebarCollapsed = false;
  isSidebarMobileShow = false;
  isMobile = false;

  // ===== ÉTATS UTILISATEUR =====
  currentUser: any = null;
  userRole: string = 'guest';

  // ===== ÉTATS BOUTIQUE =====
  boutiques: Boutique[] = [];
  selectedBoutique: Boutique | null = null;

  // ===== NAVIGATION =====
  navItems: NavItem[] = [];
  openSubmenus: Set<string> = new Set();

  // ===== SUBSCRIPTIONS =====
  private subscriptions: Subscription[] = [];
  private isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private router: Router,
    private profilService: ProfilService,
    private boutiqueContext: BoutiqueContextService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    // S'abonner aux changements de l'utilisateur
    this.subscriptions.push(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        this.userRole = user?.role || '';
        this.buildNavigation();

        // Charger les boutiques si l'utilisateur est de type boutique
        if (this.userRole === 'boutique') {
          this.loadUserBoutiques();
        } else {
          this.boutiques = [];
          this.selectedBoutique = null;
          this.boutiqueContext.clearBoutiqueSelectionnee();
           this.cdr.detectChanges();
        }
      })
    );

    // S'abonner aux changements de la boutique sélectionnée
    this.subscriptions.push(
      this.boutiqueContext.boutiqueSelectionnee$.subscribe(boutique => {
        this.selectedBoutique = boutique;
        // Mettre à jour la navigation si nécessaire (ex: ajouter l'ID dans les routes)
        this.updateNavigationWithBoutiqueId();
         this.cdr.detectChanges();
      })
    );

    // Vérifier la taille d'écran au démarrage (seulement dans le navigateur)
    if (this.isBrowser) {
      this.checkScreenSize();

      // Écouter les changements de taille d'écran
      window.addEventListener('resize', () => this.checkScreenSize());
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());

    if (this.isBrowser) {
      window.removeEventListener('resize', () => this.checkScreenSize());
    }
  }

  /**
   * Met à jour les routes de navigation avec l'ID de la boutique sélectionnée
   */
  private updateNavigationWithBoutiqueId(): void {
    // Reconstruire la navigation pour actualiser les routes
    this.buildNavigation();
  }

  /**
   * Charge la liste des boutiques de l'utilisateur
   */
  private loadUserBoutiques(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.profilService.getBoutiqueByResponsable(user._id).subscribe({
      next: (response) => {
        const boutiquesList = response.boutique || response.boutiques || [];
        this.boutiques = boutiquesList;

        if (this.boutiques.length > 0) {
          // Vérifier si une boutique est déjà sélectionnée dans le contexte
          const contextBoutique = this.boutiqueContext.getBoutiqueSelectionnee();
          
          if (contextBoutique) {
            // Vérifier que la boutique du contexte existe toujours dans la liste
            const exists = this.boutiques.some(b => b._id === contextBoutique._id);
            if (exists) {
              this.selectedBoutique = contextBoutique;
            } else {
              // Si elle n'existe plus, prendre la première
              this.selectBoutique(this.boutiques[0]);
            }
          } else {
            // Pas de boutique sélectionnée, prendre la première
            this.selectBoutique(this.boutiques[0]);
          }
        } else {
          this.selectedBoutique = null;
          this.boutiqueContext.clearBoutiqueSelectionnee();
           this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Erreur chargement boutiques:', error);
        if (error.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
           this.cdr.detectChanges();
        }
      }
    });
  }

  /**
   * Sélectionne une boutique
   */
  selectBoutique(boutique: Boutique): void {
    if (this.selectedBoutique?._id === boutique._id) return;

    this.selectedBoutique = boutique;
    
    // Mettre à jour le contexte global
    this.boutiqueContext.setBoutiqueSelectionnee(boutique);

    // Rediriger vers la page de profil boutique ou recharger les données
    if (this.router.url.includes('/boutique/')) {
      // Option 1: Recharger la page actuelle avec la nouvelle boutique
      const currentUrl = this.router.url;
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate([currentUrl]);
      });
      
      // Option 2: Émettre un événement pour recharger les données (si vous préférez)
      // this.boutiqueContext.emitBoutiqueChange();
    }
  }

  /**
   * Construit la navigation en fonction du rôle utilisateur
   */
  private buildNavigation(): void {
    switch (this.userRole) {
      case 'admin':
        this.navItems = [
          {
            label: 'Administration',
            icon: 'crown',
            exact: false,
            children: [
              {
                label: 'Clients',
                route: '/admin/clients',
                icon: 'users',
                exact: false,
              },
              {
                label: 'Tickets',
                route: '/admin/Tickets',
                icon: 'comments',
                exact: false,
              },
              {
                label: 'Aide',
                route: '/admin/help',
                icon: 'question-circle',
                exact: false,
              },
            ],
          },
          {
            label: 'Sécurité',
            route: '/admin/security',
            icon: 'lock',
            exact: false,
          },
        ];
        break;

      case 'boutique':
        // Construction des routes avec l'ID de boutique si sélectionnée
        const boutiqueId = this.selectedBoutique?._id;
        
        this.navItems = [
          {
            label: 'Profil',
            route: '/boutique/profil',
            icon: 'user',
            exact: false,
          },
          {
            label: 'Ma Boutique',
            icon: 'store',
            exact: false,
            children: [
              {
                label: 'Mes Produits',
                route: '/boutique/produits',
                icon: 'box',
                exact: false,
              },
              {
                label: 'Promotions',
                route: boutiqueId ? `/boutique/promotions/${boutiqueId}` : '/boutique/promotions',
                icon: 'percentage',
                exact: false,
              },
            ],
          },
          {
            label: 'Commandes',
            route: boutiqueId ? `/boutique/commandes/${boutiqueId}` : '/boutique/commandes',
            icon: 'shopping-cart',
            exact: false,
          },
          {
            label: 'Location',
            route: '/boutique/location',
            icon: 'map-marker-alt',
            exact: false,
          },
          {
            label: 'Support',
            route: '/boutique/support',
            icon: 'headset',
            exact: false,
          },
        ];
        break;

      case 'acheteur':
        this.navItems = [
          {
            label: 'Mes Achats',
            icon: 'shopping-cart',
            exact: false,
            children: [
              {
                label: 'Commandes',
                route: '/commandes',
                icon: 'list',
                exact: false,
              },
              {
                label: 'Favoris',
                route: '/favoris',
                icon: 'heart',
                exact: false,
              },
            ],
          },
        ];
        break;

      default:
        this.navItems = [];
    }
  }

  /**
   * Vérifie si un élément de navigation doit être désactivé
   */
  isNavItemDisabled(item: NavItem): boolean {
    // Désactiver les éléments qui nécessitent une boutique sélectionnée
    if (this.userRole === 'boutique' && !this.selectedBoutique) {
      const boutiqueRoutes = ['produits', 'promotions', 'commandes'];
      const itemRoute = item.route || '';
      return boutiqueRoutes.some(route => itemRoute.includes(route));
    }
    return false;
  }

  /**
   * Vérifie la taille d'écran et ajuste l'affichage
   */
  private checkScreenSize(): void {
    if (!this.isBrowser) return;

    this.isMobile = window.innerWidth < 992;

    if (this.isMobile) {
      this.isSidebarCollapsed = false;
      this.isSidebarMobileShow = false;
    }
  }

  /**
   * Toggle la sidebar (desktop)
   */
  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;

    if (this.isSidebarCollapsed) {
      this.openSubmenus.clear();
    }
  }

  /**
   * Toggle la sidebar mobile
   */
  toggleSidebarMobile(): void {
    if (!this.isBrowser) return;

    this.isSidebarMobileShow = !this.isSidebarMobileShow;

    if (this.isSidebarMobileShow) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  /**
   * Ferme la sidebar mobile
   */
  closeSidebarMobile(): void {
    if (!this.isBrowser) return;

    if (this.isSidebarMobileShow) {
      this.isSidebarMobileShow = false;
      document.body.style.overflow = '';
    }
  }

  /**
   * Toggle un sous-menu
   */
  toggleSubmenu(menuLabel: string): void {
    if (this.openSubmenus.has(menuLabel)) {
      this.openSubmenus.delete(menuLabel);
    } else {
      this.openSubmenus.add(menuLabel);
    }
  }

  /**
   * Vérifie si un sous-menu est ouvert
   */
  isSubmenuOpen(menuLabel: string): boolean {
    return this.openSubmenus.has(menuLabel);
  }

  /**
   * Récupère les initiales de l'utilisateur
   */
  getUserInitials(): string {
    if (!this.currentUser) return '?';

    const username = this.currentUser.username || this.currentUser.email || '';
    const parts = username.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
  }

  /**
   * Retourne le libellé du rôle
   */
  getRoleLabel(): string {
    switch (this.userRole) {
      case 'admin':
        return 'Administrateur';
      case 'boutique':
        return 'Commerçant';
      case 'acheteur':
        return 'Client';
      default:
        return 'Visiteur';
    }
  }

  /**
   * Retourne le nom de la boutique sélectionnée
   */
  getSelectedBoutiqueName(): string {
    return this.selectedBoutique?.nom || 'Aucune boutique';
  }

  /**
   * Vérifie si une boutique est sélectionnée
   */
  hasSelectedBoutique(): boolean {
    return !!this.selectedBoutique;
  }

  /**
   * Déconnexion
   */
  logout(): void {
    this.authService.logout();
    this.boutiqueContext.clearBoutiqueSelectionnee();
    this.openSubmenus.clear();
    this.router.navigate(['/login']);
    this.closeSidebarMobile();
  }
}