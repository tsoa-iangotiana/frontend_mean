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
import { TicketsComponent } from './components/boutique/ticket/ticket.component';
export const routes: Routes = [
    {path : 'inscription/:role', component : Inscription},
    {path : 'articles', component : ArticleList, canActivate: [authGuard]},
    {path: 'login', component: Login},
    {path: 'inscription', component: ChoixInscription},
    {path: 'boutique/profil', component: Profil, canActivate: [authGuard]},
    {path : '', redirectTo: '/login', pathMatch: 'full'},
    {path: 'boutique/produits', component: ProduitsComponent, canActivate: [authGuard]},
    {path: 'boutique/loyer',component : PayerLoyerComponent, canActivate: [authGuard, BoutiqueSelectionneeGuard]},
    {path:'boutique/historique-paiement', component:HistoriqueLoyerComponent , canActivate: [authGuard, BoutiqueSelectionneeGuard]},
    {path:'boutique/all', component:ListeBoutique },
    {path:'boutique/ticket', component: TicketsComponent , canActivate: [authGuard, BoutiqueSelectionneeGuard]},
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
