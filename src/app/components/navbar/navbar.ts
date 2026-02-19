import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, Input } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth';
import { Subscription } from 'rxjs';

interface NavItem {
  label: string;
  route?: string;
  icon: string;
  children?: NavItem[];
  exact: boolean;
  badge?: number | null;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'boutique' | 'acheteur' | 'guest';
}

interface Boutique {
  id: string;
  nom: string;
  categorie: string;
  logo?: string;
  actif: boolean;
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
        }
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
   * Charge la liste des boutiques de l'utilisateur
   */
  private loadUserBoutiques(): void {
    // Simulation - À remplacer par un vrai service
    // this.boutiqueService.getUserBoutiques().subscribe(boutiques => {
    //   this.boutiques = boutiques;
    //   if (boutiques.length > 0 && !this.selectedBoutique) {
    //     this.selectedBoutique = boutiques[0];
    //     this.saveSelectedBoutiqueToStorage();
    //   }
    // });

    // Données de test
    setTimeout(() => {
      this.boutiques = [
        {
          id: '1',
          nom: 'Ma Boutique Principale',
          categorie: 'Vêtements',
          actif: true
        },
        {
          id: '2',
          nom: 'Boutique Secondaire',
          categorie: 'Accessoires',
          actif: true
        }
      ];

      if (this.boutiques.length > 0 && !this.selectedBoutique) {
        this.selectedBoutique = this.boutiques[0];
        this.saveSelectedBoutiqueToStorage();
        this.emitBoutiqueChange();
      }
    }, 500);
  }

  /**
   * Charge la boutique sélectionnée depuis le localStorage
   */
  private loadSelectedBoutiqueFromStorage(): void {
    if (!this.isBrowser) return;

    const savedBoutiqueId = localStorage.getItem('selectedBoutiqueId');
    if (savedBoutiqueId && this.boutiques.length > 0) {
      const found = this.boutiques.find(b => b.id === savedBoutiqueId);
      if (found) {
        this.selectedBoutique = found;
      }
    }
  }

  /**
   * Sauvegarde la boutique sélectionnée dans le localStorage
   */
  private saveSelectedBoutiqueToStorage(): void {
    if (!this.isBrowser || !this.selectedBoutique) return;

    localStorage.setItem('selectedBoutiqueId', this.selectedBoutique.id);
  }

  /**
   * Sélectionne une boutique
   */
  selectBoutique(boutique: Boutique): void {
    if (this.selectedBoutique?.id === boutique.id) return;

    this.selectedBoutique = boutique;
    this.saveSelectedBoutiqueToStorage();
    this.emitBoutiqueChange();

    // Optionnel : Recharger les données pour la nouvelle boutique
    // this.reloadBoutiqueData();
  }

  /**
   * Émet un événement de changement de boutique
   */
  private emitBoutiqueChange(): void {
    // Émettre un événement personnalisé pour que les autres composants réagissent
    if (this.isBrowser) {
      const event = new CustomEvent('boutiqueChange', {
        detail: this.selectedBoutique
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Recharge les données pour la boutique sélectionnée
   */
  private reloadBoutiqueData(): void {
    // Rediriger vers la page appropriée avec l'ID de boutique
    if (this.selectedBoutique && this.router.url.includes('/boutique/')) {
      // Recharger les données du composant actuel si nécessaire
      // Vous pouvez utiliser un service pour notifier les composants
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
                route: '/boutique/promotions',
                icon: 'percentage',
                exact: false,
              },
            ],
          },
           {
            label: 'Commandes',
            route: '/boutique/commandes',
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

    const parts = this.currentUser.username.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return this.currentUser.username.substring(0, 2).toUpperCase();
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
   * Déconnexion
   */
  logout(): void {
    this.authService.logout();
    this.openSubmenus.clear();
    this.router.navigate(['/login']);
    this.closeSidebarMobile();
  }
}
