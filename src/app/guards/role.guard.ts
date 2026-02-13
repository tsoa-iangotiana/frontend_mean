// // guards/role.guard.ts
// import { inject } from '@angular/core';
// import { Router, type CanActivateFn } from '@angular/router';
// import { AuthService } from '../services/auth';

// export const roleGuard: CanActivateFn = (route, state) => {
//   const authService = inject(AuthService);
//   const router = inject(Router);
//   const user = authService.getToj();

//   // Récupérer les rôles requis depuis la route
//   const requiredRoles = route.data['roles'] as string[];

//   if (!user) {
//     router.navigate(['/login']);
//     return false;
//   }

//   if (!requiredRoles || requiredRoles.includes(user.role)) {
//     return true;
//   }

//   // Accès refusé - rediriger vers page d'accueil ou erreur
//   router.navigate(['/unauthorized']);
//   return false;
// };