// auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth';
import { of, timer } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (typeof window === 'undefined') {
    return of(true);
  }

  // ⏱️ Augmenter à 350-400ms pour être sûr
  return timer(400).pipe(
    map(() => {
      const token = auth.getToken();
      if (token) {
        return true;
      }
      router.navigate(['/login']);
      return false;
    })
  );
};