import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
  imports: [
    CommonModule,
    RouterModule,
    NgbModule
  ],
})
export class NavbarComponent implements OnInit, OnDestroy {
  // États sidebar
  isSidebarCollapsed = false;
  isSidebarMobileShow = false;
  
  // États utilisateur
  currentUser: any = null;
  userRole: string = '';
  isOnline = true;
  cartCount = 0;
  
  // Sous-menus ouverts
  openSubmenus: Set<string> = new Set();
  
  // Subscriptions
  private subscriptions: Subscription[] = [];
  
  // Flag pour vérifier si on est dans le navigateur
  private isBrowser: boolean;

  // Navigation items
  navItems: NavItem[] = [];

  constructor(
    public authService: AuthService,
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

    // Simuler un compteur panier (à remplacer par votre service)
    this.loadCartCount();
    
    // Vérifier la taille d'écran au démarrage (seulement dans le navigateur)
    if (this.isBrowser) {
      this.checkScreenSize();
      
      // Écouter les changements de taille d'écran
      window.addEventListener('resize', () => this.checkScreenSize());
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Nettoyer l'event listener seulement si on est dans le navigateur
    if (this.isBrowser) {
      window.removeEventListener('resize', () => this.checkScreenSize());
    }
  }

  /**
   * Construit la navigation en fonction du rôle
   */
  private buildNavigation(): void {
    const baseNav: NavItem[] = [
      {
        label: 'Accueil',
        route: '/',
        icon: 'home',
        exact: true
      },
      {
        label: 'Boutiques',
        route: '/boutiques',
        icon: 'store-alt',
        exact: false
      },
      {
        label: 'Produits',
        route: '/produits',
        icon: 'box',
        exact: false
      }
    ];

    // Ajouter les items selon le rôle
    switch (this.userRole) {
      case 'admin':
        this.navItems = [
          ...baseNav,
          {
            label: 'Administration',
            icon: 'crown',
            exact: false,
            children: [
              { label: 'Dashboard', route: '/admin/dashboard', icon: 'chart-pie', exact: false },
              { label: 'Boxes', route: '/admin/boxes', icon: 'cubes', exact: false },
              { label: 'Paiements', route: '/admin/paiements', icon: 'credit-card', exact: false },
              { label: 'Tickets', route: '/admin/tickets', icon: 'ticket-alt', exact: false },
              { label: 'Catégories', route: '/admin/categories', icon: 'tags', exact: false },
              { label: 'Utilisateurs', route: '/admin/utilisateurs', icon: 'users', exact: false }
            ]
          }
        ];
        break;
        
      case 'boutique':
        this.navItems = [
          ...baseNav,
          {
            label: 'Boutique',
            icon: 'store',
            exact: false,
            children: [
              { label: 'Dashboard', route: '/boutique/dashboard', icon: 'chart-line', exact: false },
              { label: 'Mes Produits', route: '/boutique/produits', icon: 'boxes', exact: false },
              { label: 'Commandes', route: '/boutique/commandes', icon: 'shopping-bag', exact: false },
              { label: 'Promotions', route: '/boutique/promotions', icon: 'percentage', exact: false },
              { label: 'Statistiques', route: '/boutique/stats', icon: 'chart-bar', exact: false }
            ]
          }
        ];
        break;
        
      case 'acheteur':
        this.navItems = [
          ...baseNav,
          {
            label: 'Mes achats',
            icon: 'shopping-cart',
            exact: false,
            children: [
              { label: 'Mes Commandes', route: '/commandes', icon: 'truck', exact: false },
              { label: 'Favoris', route: '/favoris', icon: 'heart', exact: false }
            ]
          }
        ];
        break;
        
      default:
        this.navItems = baseNav;
    }
  }

  /**
   * Charge le nombre d'articles dans le panier
   */
  private loadCartCount(): void {
    // À remplacer par votre service panier
    // this.subscriptions.push(
    //   this.cartService.cartCount$.subscribe(count => {
    //     this.cartCount = count;
    //   })
    // );
    
    // Simulation
    this.cartCount = 3;
  }

  /**
   * Vérifie la taille d'écran pour ajuster la sidebar
   */
  checkScreenSize(): void {
    // Vérifier qu'on est dans le navigateur
    if (!this.isBrowser) return;
    
    if (window.innerWidth < 992) {
      this.isSidebarCollapsed = false;
      // Sur mobile, on ferme la sidebar par défaut
      this.isSidebarMobileShow = false;
    }
    // Pas de else nécessaire car on garde l'état existant sur desktop
  }

  /**
   * Toggle la sidebar (desktop)
   */
  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    
    // Fermer tous les sous-menus quand on collapse
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
    
    // Empêcher le scroll du body quand sidebar mobile ouverte
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
   * Déconnexion
   */
  logout(): void {
    this.authService.removeToken();
    this.router.navigate(['/login']);
    this.closeSidebarMobile();
    
    // Réinitialiser les états
    this.openSubmenus.clear();
  }

  /**
   * Retourne la classe CSS pour le badge de rôle
   */
  getRoleBadgeClass(): string {
    switch (this.userRole) {
      case 'admin': return 'bg-danger';
      case 'boutique': return 'bg-success';
      case 'acheteur': return 'bg-info';
      default: return 'bg-secondary';
    }
  }

  /**
   * Retourne le libellé du rôle
   */
  getRoleLabel(): string {
    switch (this.userRole) {
      case 'admin': return 'Administrateur';
      case 'boutique': return 'Commerçant';
      case 'acheteur': return 'Client';
      default: return 'Visiteur';
    }
  }
}