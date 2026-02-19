// guards/boutique-selectionnee.guard.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BoutiqueContextService } from '../services/boutique/context/boutique.context.service';

@Injectable({
  providedIn: 'root'
})
export class BoutiqueSelectionneeGuard {
  constructor(
    private boutiqueContext: BoutiqueContextService,
    private router: Router
  ) {}

  canActivate(): boolean {
    if (this.boutiqueContext.hasBoutiqueSelectionnee()) {
      return true;
    }
    
    this.router.navigate(['/profil']);
    return false;
  }
}