// auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';

export const authGuard: CanActivateFn = async (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Côté serveur : laisser passer pour le rendu initial
  if (!auth.isBrowser()) {
    return true;
  }

  // ✅ Attendre l'initialisation de l'authentification
  const isAuthenticated = await auth.initializeAuth();

  if (isAuthenticated) {
    console.log('✅ Authentifié - Accès autorisé');
    return true;
  }

  // Pas de token : redirection vers login
  console.log('🔒 Non authentifié - Redirection vers login');
  router.navigate(['/login']);
  return false;
};