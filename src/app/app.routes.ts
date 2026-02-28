import { Routes } from '@angular/router';
import { ArticleList } from './components/article/article-list/article-list';
import { Home } from './components/home/home';
import { Inscription } from './components/user/inscription/inscription';
import { ChoixInscription } from './components/user/choix-inscription/ChoixInscription';
import { authGuard } from './guards/auth.guard';
// import { roleGuard } from './guards/role.guard';
import { Login } from './components/user/login/login';
import { Profil } from './components/boutique/profil/profil';
import { ProduitsComponent } from './components/boutique/produit/produit.component';
import { BoutiqueSelectionneeGuard } from './guards/boutique-selectionne.guard';
import { PayerLoyerComponent } from './components/boutique/paiement/payer-loyer.component';
import { HistoriqueLoyerComponent } from './components/boutique/paiement/historique-loyer.component';
import { ListeBoutique } from './components/boutique/liste-boutique/ListeBoutique';
import { ListeProduitsAcheteurComponent } from './components/acheteur/liste-produits/liste-produits';
import { TicketComponent } from './components/boutique/ticket/ticket.component';
import { TicketManagementComponent } from './components/admin/ticket/ticket-management.component';
import { BoxManagementComponent } from './components/admin/box/box-management.component';
import { BoutiqueManagementComponent } from './components/admin/boutique/boutique-management.component';
import { DashboardComponent } from './components/admin/dashboard/dashboard.component';
import path from 'path';
import { CategorieComponent } from './components/admin/categorie/categorie.component';
export const routes: Routes = [
    {path: 'inscription/:role', component : Inscription},
    {path: 'articles', component : ArticleList, canActivate: [authGuard]},
    {path: 'login', component: Login},
    {path: 'inscription', component: ChoixInscription},
    {path: '', redirectTo: '/login', pathMatch: 'full'},

    {path:'admin/tickets', component:TicketManagementComponent, canActivate: [authGuard]},
    {path:'admin/dashboard', component:DashboardComponent, canActivate: [authGuard]},
    {path:'admin/categories', component: CategorieComponent, canActivate: [authGuard]},
    {path:'admin/boutique', component:BoutiqueManagementComponent, canActivate: [authGuard]},
    {path:'admin/clients',component: BoxManagementComponent, canActivate: [authGuard]},

    {path:'boutique/historique-paiement', component:HistoriqueLoyerComponent , canActivate: [authGuard, BoutiqueSelectionneeGuard]},
    {path:'boutique/all', component:ListeBoutique },
    {path:'boutique/ticket', component: TicketComponent , canActivate: [authGuard, BoutiqueSelectionneeGuard]},
    {path:'boutique/profil', component: Profil, canActivate: [authGuard]},
    {path:'boutique/produits', component: ProduitsComponent, canActivate: [authGuard]},
    {path:'boutique/loyer',component : PayerLoyerComponent, canActivate: [authGuard, BoutiqueSelectionneeGuard]},


    {path:'acheteur/:boutiqueId/produits', component: ListeProduitsAcheteurComponent },
    {
      path: 'acheteur/factures',
      loadComponent: () => import('./components/acheteur/facture/facture').then(m => m.Facture)
    },
    {path: 'panier', loadComponent: () => import('./components/acheteur/panier/panier')
      .then(m => m.PanierComponent),
      canActivate: [authGuard] // Protection
    },
    {path: 'commandes', loadComponent: () => import('./components/acheteur/commandes/commandes')
      .then(m => m.Commandes),
      canActivate: [authGuard]
    },
    //      {
//     path: 'admin',
//     loadComponent: () => import('./components/admin/admin.component')
//       .then(m => m.Admin),
//     canActivate: [authGuard, roleGuard], // ✅ DOUBLE PROTECTION
//     data: { roles: ['admin'] } // Rôles requis
//   },
//   {
//     path: 'boutique',
//     loadComponent: () => import('./components/boutique/boutique.component')
//       .then(m => m.Boutique),
//     canActivate: [authGuard, roleGuard],
//     data: { roles: ['boutique', 'admin'] }
//   }
];
