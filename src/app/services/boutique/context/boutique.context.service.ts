import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { Boutique } from '../profil/profil.service';

@Injectable({
  providedIn: 'root',
})
export class BoutiqueContextService {
  private boutiqueSelectionneeSubject = new BehaviorSubject<Boutique | null>(null);
  boutiqueSelectionnee$: Observable<Boutique | null> = this.boutiqueSelectionneeSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$: Observable<boolean> = this.loadingSubject.asObservable();

  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    // Restauration synchrone au démarrage — seulement en browser
    // C'est ce qui garantit que le BehaviorSubject a déjà la bonne valeur
    // quand payer-loyer s'y abonne, sans avoir besoin de startWith().
    this.restaurerDerniereBoutique();
  }

  setBoutiqueSelectionnee(boutique: Boutique | null): void {
    if (this.isBrowser) {
      if (boutique) {
        localStorage.setItem('boutiqueSelectionnee', JSON.stringify(boutique));
      } else {
        localStorage.removeItem('boutiqueSelectionnee');
      }
    }
    this.boutiqueSelectionneeSubject.next(boutique);
  }

  getBoutiqueSelectionnee(): Boutique | null {
    return this.boutiqueSelectionneeSubject.getValue();
  }

  setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  restaurerDerniereBoutique(): Boutique | null {
    if (!this.isBrowser) return null;

    const saved = localStorage.getItem('boutiqueSelectionnee');
    if (saved) {
      try {
        const boutique = JSON.parse(saved);
        this.boutiqueSelectionneeSubject.next(boutique);
        return boutique;
      } catch {
        localStorage.removeItem('boutiqueSelectionnee');
      }
    }
    return null;
  }

  hasBoutiqueSelectionnee(): boolean {
    return this.boutiqueSelectionneeSubject.getValue() !== null;
  }

  clearBoutiqueSelectionnee(): void {
    if (this.isBrowser) {
      localStorage.removeItem('boutiqueSelectionnee');
    }
    this.boutiqueSelectionneeSubject.next(null);
  }
}