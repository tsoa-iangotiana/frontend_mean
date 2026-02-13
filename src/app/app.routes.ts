import { Routes } from '@angular/router';
import { ArticleList } from './components/article/article-list/article-list';
import { Home } from './components/home/home';
import { Inscription } from './components/user/inscription/inscription';
import { authGuard } from './guards/auth.guard';
// import { roleGuard } from './guards/role.guard';
import { Login } from './components/user/login/login';
export const routes: Routes = [
    {path : 'login', loadComponent: () => import('./components/user/login/login').then(m => m.Login)},
    {path : 'inscription/:role', component : Inscription},
    {path : 'articles', component : ArticleList, canActivate: [authGuard]},
    {path : '', component: Login }
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
