import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  PLATFORM_ID,
  Input,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  ViewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth';
import { Subscription } from 'rxjs';
import { Boutique, ProfilService } from '../../services/boutique/profil/profil.service';
import { BoutiqueContextService } from '../../services/boutique/context/boutique.context.service';
import { PanierService } from '../../services/acheteur/panier/panier.service';
import { SidebarPanier } from '../../components/acheteur/sidebarpanier/sidebarPanier';
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
  imports: [CommonModule, RouterModule, NgbModule, SidebarPanier],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent implements OnInit, OnDestroy {
  @Input() pageTitle: string = 'Centre Commercial';

  // Dans la classe
  @ViewChild('panierSidebar') panierSidebar!: SidebarPanier;

  isSidebarCollapsed = false;
  isSidebarMobileShow = false;
  isMobile = false;

  currentUser: any = null;
  userRole: string = 'guest';

  boutiques: Boutique[] = [];
  selectedBoutique: Boutique | null = null;

  navItems: NavItem[] = [];
  openSubmenus: Set<string> = new Set();

  panierEstVide: boolean = true;
  nombreArticlesPanier: number = 0;

  private subscriptions: Subscription[] = [];
  private isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private router: Router,
    private profilService: ProfilService,
    private panierService: PanierService,
    private boutiqueContext: BoutiqueContextService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  async ngOnInit(): Promise<void> {
    if (!this.authService.isBrowser()) return;

    await this.authService.initializeAuth();

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    // 1. S'abonner à la boutique sélectionnée EN PREMIER,
    //    avant tout appel HTTP, pour ne jamais rater une émission.
    this.subscriptions.push(
      this.boutiqueContext.boutiqueSelectionnee$.subscribe((boutique) => {
        this.selectedBoutique = boutique;
        this.buildNavigation();
        this.cdr.markForCheck();
      })
    );

    // 2. S'abonner à l'utilisateur et charger les boutiques
    this.subscriptions.push(
      this.authService.currentUser$.subscribe((user) => {
        this.currentUser = user;
        this.userRole = user?.role || '';
        this.buildNavigation();
        this.cdr.markForCheck();

        if (this.userRole === 'boutique') {
          this.loadUserBoutiques();
        } else {
          this.boutiques = [];
          this.selectedBoutique = null;
          this.boutiqueContext.clearBoutiqueSelectionnee();
          this.cdr.markForCheck();
        }
      })
    );

    // S'abonner au panier
    this.subscriptions.push(
      this.panierService.panier$.subscribe(panier => {
        this.panierEstVide = !panier || panier.nombre_articles === 0;
        this.nombreArticlesPanier = panier?.nombre_articles || 0;
        this.cdr.markForCheck();
      })
    );

    if (this.isBrowser) {
      this.checkScreenSize();
      window.addEventListener('resize', () => this.checkScreenSize());
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    if (this.isBrowser) {
      window.removeEventListener('resize', () => this.checkScreenSize());
    }
  }

  openPanierSidebar(event: Event): void {
    event.preventDefault();
    this.panierSidebar.open();
  }

  private loadUserBoutiques(): void {
    const user = this.authService.getCurrentUser();
    if (!user) return;

    this.profilService.getBoutiqueByResponsable(user._id).subscribe({
      next: (response) => {
        const boutiquesList = response.boutique || response.boutiques || [];
        this.boutiques = boutiquesList;

        if (this.boutiques.length === 0) {
          this.boutiqueContext.clearBoutiqueSelectionnee();
          this.cdr.markForCheck();
          return;
        }

        const contextBoutique = this.boutiqueContext.getBoutiqueSelectionnee();

        if (contextBoutique) {
          // La boutique du localStorage existe-t-elle encore dans la liste ?
          const freshBoutique = this.boutiques.find((b) => b._id === contextBoutique._id);

          if (freshBoutique) {
            // ✅ FIX : on réémet toujours via setBoutiqueSelectionnee() pour que
            // tous les composants abonnés (payer-loyer, etc.) reçoivent les données
            // fraîches de l'API (pas celles potentiellement périmées du localStorage).
            this.boutiqueContext.setBoutiqueSelectionnee(freshBoutique);
          } else {
            // La boutique sauvegardée n'existe plus → prendre la première
            this.boutiqueContext.setBoutiqueSelectionnee(this.boutiques[0]);
          }
        } else {
          // Aucune boutique en contexte → sélectionner la première
          this.boutiqueContext.setBoutiqueSelectionnee(this.boutiques[0]);
        }

        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Erreur chargement boutiques:', error);
        if (error.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * Sélectionne une boutique manuellement (clic utilisateur dans la navbar)
   */
  selectBoutique(boutique: Boutique): void {
    // Pas de early-return sur l'ID ici : on laisse le subscriber gérer la déduplication
    this.boutiqueContext.setBoutiqueSelectionnee(boutique);

    // Recharger la page courante si on est déjà dans /boutique/
    if (this.router.url.includes('/boutique/')) {
      const currentUrl = this.router.url;
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigate([currentUrl]);
      });
    }
  }

  private buildNavigation(): void {
    switch (this.userRole) {
      case 'admin':
        this.navItems = [
          {
            label: 'Dashboard',
            route:'/admin/dashboard',
            icon: 'tachometer-alt',
            exact: true,
          },
          {
            label: 'Administration',
            icon: 'crown',
            exact: false,
            children: [
              { label: 'Boutiques', route: '/admin/clients', icon: 'users', exact: false },
              { label: 'Tickets', route: '/admin/Tickets', icon: 'comments', exact: false },
              { label: 'Aide', route: '/admin/help', icon: 'question-circle', exact: false },
            ],
          },
          { label: 'Sécurité', route: '/admin/security', icon: 'lock', exact: false },
        ];
        break;

      case 'boutique':
        const boutiqueId = this.selectedBoutique?._id;

        this.navItems = [
          { label: 'Profil', route: '/boutique/profil', icon: 'user', exact: false },
          {
            label: 'Ma Boutique',
            icon: 'store',
            exact: false,
            children: [
              { label: 'Mes Produits', route: '/boutique/produits', icon: 'box', exact: true },
              // {
              //   label: 'Promotions',
              //   route: boutiqueId ? `/boutique/promotions/${boutiqueId}` : '/boutique/promotions',
              //   icon: 'percentage',
              //   exact: false,
              // },
            ],
          },
          {
            label: 'Commandes',
            route: boutiqueId ? `/boutique/commandes/${boutiqueId}` : '/boutique/commandes',
            icon: 'shopping-cart',
            exact: false,
          },
          { label: 'Location', route: '/boutique/loyer', icon: 'map-marker-alt', exact: false,
            children:[
          {
            label: 'Payer Loyer',
            route: '/boutique/loyer',
            icon: 'money-bill-wave',
            exact: false,
          },
          {
            label: 'Historique Paiement',
            route: '/boutique/historique-paiement',
            icon: 'history',
            exact: false
          }
        ]},

          { label: 'Support', route: '/boutique/ticket', icon: 'headset', exact: false },
        ];
        break;

      case 'acheteur':
        this.navItems = [
          {
            label: 'Boutiques', route: '/boutique/all', icon : 'store', exact: false,
          },
          {
            label: 'Mes Achats',
            icon: 'shopping-cart',
            exact: false,
            children: [
              { label: 'Commandes', route: '/commandes', icon: 'list', exact: false },
            ],
          },
        ];
        break;

      default:
        this.navItems = [];
    }
  }

  isNavItemDisabled(item: NavItem): boolean {
    if (this.userRole === 'boutique' && !this.selectedBoutique) {
      const boutiqueRoutes = ['produits', 'promotions', 'commandes'];
      return boutiqueRoutes.some((route) => (item.route || '').includes(route));
    }
    return false;
  }

  private checkScreenSize(): void {
    if (!this.isBrowser) return;
    this.isMobile = window.innerWidth < 992;
    if (this.isMobile) {
      this.isSidebarCollapsed = false;
      this.isSidebarMobileShow = false;
    }
    this.cdr.markForCheck();
  }

  toggleSidebar(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
    if (this.isSidebarCollapsed) this.openSubmenus.clear();
  }

  toggleSidebarMobile(): void {
    if (!this.isBrowser) return;
    this.isSidebarMobileShow = !this.isSidebarMobileShow;
    document.body.style.overflow = this.isSidebarMobileShow ? 'hidden' : '';
  }

  closeSidebarMobile(): void {
    if (!this.isBrowser) return;
    if (this.isSidebarMobileShow) {
      this.isSidebarMobileShow = false;
      document.body.style.overflow = '';
    }
  }

  toggleSubmenu(menuLabel: string): void {
    if (this.openSubmenus.has(menuLabel)) {
      this.openSubmenus.delete(menuLabel);
    } else {
      this.openSubmenus.add(menuLabel);
    }
  }

  isSubmenuOpen(menuLabel: string): boolean {
    return this.openSubmenus.has(menuLabel);
  }

  getUserInitials(): string {
    if (!this.currentUser) return '?';
    const username = this.currentUser.username || this.currentUser.email || '';
    const parts = username.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return username.substring(0, 2).toUpperCase();
  }

  getRoleLabel(): string {
    switch (this.userRole) {
      case 'admin': return 'Administrateur';
      case 'boutique': return 'Commerçant';
      case 'acheteur': return 'Client';
      default: return 'Visiteur';
    }
  }

  getSelectedBoutiqueName(): string {
    return this.selectedBoutique?.nom || 'Aucune boutique';
  }

  hasSelectedBoutique(): boolean {
    return !!this.selectedBoutique;
  }

  logout(): void {
    this.authService.logout();
    this.boutiqueContext.clearBoutiqueSelectionnee();
    this.openSubmenus.clear();
    this.router.navigate(['/login']);
    this.closeSidebarMobile();
  }
}
