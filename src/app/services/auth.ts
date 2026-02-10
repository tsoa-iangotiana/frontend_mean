// services/auth.service.ts
import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'token';

  constructor(@Inject(PLATFORM_ID) private platformId: any) {}

  setToken(token: string): void {
    if (this.isBrowser()) {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
  }

  getToken(): string | null {
    if (this.isBrowser()) {
      return localStorage.getItem(this.TOKEN_KEY);
    }
    return null;
  }

  removeToken(): void {
    if (this.isBrowser()) {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
  // Dans auth.service.ts
initializeAuth(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(false);
      return;
    }
    
    // Attendre que l'application soit initialisée
    setTimeout(() => {
      const token = this.getToken();
      console.log('🔐 Initialisation auth - Token:', token ? 'Présent' : 'Absent');
      resolve(!!token);
    }, 100);
  });
}
}