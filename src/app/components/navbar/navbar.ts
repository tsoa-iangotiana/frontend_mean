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
   * Construit la navigation en fonction du rôle utilisateur
   */
  private buildNavigation(): void {
    const baseNav: NavItem[] = [
      {
        label: 'Tableau de bord',
        route: '/',
        icon: 'home',
        exact: true,
      },
      {
        label: 'Produits',
        route: '/produits',
        icon: 'shopping-bag',
        exact: false,
      },
    ];

    switch (this.userRole) {
      case 'admin':
        this.navItems = [
          ...baseNav,
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
                label: 'Messages',
                route: '/admin/messages',
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
          ...baseNav,
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
                label: 'Commandes',
                route: '/boutique/commandes',
                icon: 'truck',
                exact: false,
              },
              {
                label: 'Promotions',
                route: '/boutique/promotions',
                icon: 'percentage',
                exact: false,
              },
              {
                label: 'Statistiques',
                route: '/boutique/stats',
                icon: 'chart-bar',
                exact: false,
              },
            ],
          },
        ];
        break;

      case 'acheteur':
        this.navItems = [
          ...baseNav,
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
        this.navItems = baseNav;
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
    // this.authService.logout();
    this.openSubmenus.clear();
    this.router.navigate(['/login']);
    this.closeSidebarMobile();
  }
}
