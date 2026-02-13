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
  private token: string | null = null;
  private authReady = false;
  private initPromise: Promise<boolean> | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: any) {}

  setToken(token: string): void {
    this.token = token;
    if (this.isBrowser()) {
      localStorage.setItem(this.TOKEN_KEY, token);
      console.log('🔐 Token stocké (mémoire + localStorage)');
    }
    
    // ✅ CRUCIAL : Réinitialiser le cache pour forcer une nouvelle vérification
    this.resetAuthCache();
  }

  getToken(): string | null {
    if (this.token) {
      return this.token;
    }

    if (this.isBrowser()) {
      const storedToken = localStorage.getItem(this.TOKEN_KEY);
      if (storedToken) {
        this.token = storedToken;
        return storedToken;
      }
    }
    
    return null;
  }

  removeToken(): void {
    this.token = null;
    if (this.isBrowser()) {
      localStorage.removeItem(this.TOKEN_KEY);
      console.log('🔓 Token supprimé');
    }
    
    // ✅ CRUCIAL : Réinitialiser le cache après déconnexion
    this.resetAuthCache();
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    const loggedIn = !!token;
    console.log('🔍 isLoggedIn():', loggedIn, 'Token:', token ? token.substring(0, 20) + '...' : 'null');
    return loggedIn;
  }

  isAuthReady(): boolean {
    return this.authReady;
  }

  isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  // ✅ NOUVEAU : Réinitialiser le cache
  private resetAuthCache(): void {
    console.log('🔄 Réinitialisation du cache auth');
    this.initPromise = null;
    this.authReady = false;
  }

  initializeAuth(): Promise<boolean> {
    if (this.initPromise) {
      console.log('♻️ initializeAuth() déjà appelé - retour du cache');
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve) => {
      console.log('🚀 initializeAuth() - PREMIÈRE initialisation');
      console.log('🌍 isBrowser:', this.isBrowser());
      
      if (!this.isBrowser()) {
        this.authReady = true;
        resolve(false);
        return;
      }

      console.log('📂 localStorage.length:', localStorage.length);
      const storedToken = localStorage.getItem(this.TOKEN_KEY);
      console.log('🔑 localStorage.getItem("token"):', storedToken);
      
      if (storedToken) {
        // ✅ Vérifier si le token est expiré
        try {
          const parts = storedToken.split('.');
          const payload = JSON.parse(atob(parts[1]));
          const expDate = new Date(payload.exp * 1000);
          const now = new Date();
          
          console.log('📅 Token expire le:', expDate);
          console.log('📅 Date actuelle:', now);
          
          if (expDate < now) {
            console.log('⏰ Token expiré - Suppression automatique');
            localStorage.removeItem(this.TOKEN_KEY);
            this.token = null;
            this.authReady = true;
            resolve(false);
            return;
          }
        } catch (e) {
          console.error('❌ Erreur décodage token:', e);
        }
        
        this.token = storedToken;
        console.log('🔐 Token restauré:', storedToken.substring(0, 30) + '...');
        this.authReady = true;
        resolve(true);
      } else {
        console.log('⚠️ Aucun token trouvé dans localStorage');
        this.authReady = true;
        resolve(false);
      }
    });

    return this.initPromise;
  }
}