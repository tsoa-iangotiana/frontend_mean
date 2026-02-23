// services/boutique/boutique-context.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Boutique } from '../profil/profil.service';

@Injectable({
  providedIn: 'root'
})
export class BoutiqueContextService {
  private boutiqueSelectionneeSubject = new BehaviorSubject<Boutique | null>(null);
  boutiqueSelectionnee$: Observable<Boutique | null> = this.boutiqueSelectionneeSubject.asObservable();

  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$: Observable<boolean> = this.loadingSubject.asObservable();

  constructor() {
    this.restaurerDerniereBoutique();
  }

  setBoutiqueSelectionnee(boutique: Boutique | null): void {
    // Sauvegarder aussi dans localStorage pour persister après refresh
    if (boutique) {
      localStorage.setItem('boutiqueSelectionnee', JSON.stringify(boutique));
    } else {
      localStorage.removeItem('boutiqueSelectionnee');
    }
    this.boutiqueSelectionneeSubject.next(boutique);
  }

  getBoutiqueSelectionnee(): Boutique | null {
    return this.boutiqueSelectionneeSubject.getValue();
  }

  setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  // Charger la boutique depuis localStorage au démarrage
  restaurerDerniereBoutique(): Boutique | null {
    const saved = localStorage.getItem('boutiqueSelectionnee');
    if (saved) {
      try {
        const boutique = JSON.parse(saved);
        this.boutiqueSelectionneeSubject.next(boutique);
        return boutique;
      } catch (e) {
        localStorage.removeItem('boutiqueSelectionnee');
      }
    }
    return null;
  }

  // Vérifier si une boutique est sélectionnée
  hasBoutiqueSelectionnee(): boolean {
    return this.boutiqueSelectionneeSubject.getValue() !== null;
  }

  // Effacer la sélection
  clearBoutiqueSelectionnee(): void {
    localStorage.removeItem('boutiqueSelectionnee');
    this.boutiqueSelectionneeSubject.next(null);
  }
}