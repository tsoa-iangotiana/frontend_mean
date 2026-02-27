import { Component, OnInit, OnDestroy, ChangeDetectorRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { PanierService, Panier, PanierItem } from '../../../services/acheteur/panier/panier.service';
import { ToastService } from '../../../services/utils/toast/toast.service';

interface GroupeBoutique {
  boutique: {
    _id: string;
    nom: string;
  };
  items: PanierItem[];
  total: number;
}

@Component({
  selector: 'app-sidebarPanier',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './sidebarPanier.html',
  styleUrls: ['./sidebarPanier.css']
})
export class SidebarPanier implements OnInit, OnDestroy {
  @Output() closed = new EventEmitter<void>();

  panier: Panier | null = null;
  loading = false;
  updatingItems = new Set<string>();
  isOpen = false;

  private destroy$ = new Subject<void>();

  constructor(
    private panierService: PanierService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.panierService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.loading = loading;
        this.cdr.markForCheck();
      });

    this.panierService.panier$
      .pipe(takeUntil(this.destroy$))
      .subscribe(panier => {
        this.panier = panier;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  open(): void {
    this.isOpen = true;
    document.body.style.overflow = 'hidden'; // Empêche le scroll du body
  }

  close(): void {
    this.isOpen = false;
    document.body.style.overflow = ''; // Réactive le scroll
    this.closed.emit();
  }

  modifierQuantite(produitId: string, nouvelleQuantite: number): void {
    if (nouvelleQuantite < 1) {
      this.toastService.show('La quantité doit être au moins 1', 'warning');
      return;
    }

    const item = this.panier?.items.find(i => i.produit._id === produitId);
    if (item && nouvelleQuantite > item.stock_disponible) {
      this.toastService.show(`Stock maximum: ${item.stock_disponible}`, 'warning');
      return;
    }

    this.updatingItems.add(produitId);
    this.panierService.modifierQuantite(produitId, nouvelleQuantite).subscribe({
      next: () => {
        this.updatingItems.delete(produitId);
        this.cdr.markForCheck();
      },
      error: () => {
        this.updatingItems.delete(produitId);
        this.cdr.markForCheck();
      }
    });
  }

  supprimerProduit(produitId: string): void {
    if (!confirm('Supprimer cet article du panier ?')) return;

    this.updatingItems.add(produitId);
    this.panierService.supprimerProduit(produitId).subscribe({
      next: () => {
        this.updatingItems.delete(produitId);
        this.toastService.show('Article supprimé', 'success');
        this.cdr.markForCheck();
      },
      error: () => {
        this.updatingItems.delete(produitId);
        this.cdr.markForCheck();
      }
    });
  }

  viderPanier(): void {
    if (!confirm('Vider tout le panier ?')) return;

    this.panierService.viderPanier().subscribe({
      next: () => {
        this.toastService.show('Panier vidé', 'success');
        setTimeout(() => {
          this.panierService.rechargerPanier();
          this.cdr.markForCheck();
        }, 100);
      },
      error: (err) => {
        this.toastService.show('Erreur lors du vidage du panier', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  get itemsParBoutique(): Map<string, GroupeBoutique> {
    const map = new Map<string, GroupeBoutique>();
    this.panier?.items.forEach(item => {
      const boutiqueId = item.produit.boutique._id;
      if (!map.has(boutiqueId)) {
        map.set(boutiqueId, {
          boutique: item.produit.boutique,
          items: [],
          total: 0
        });
      }
      const group = map.get(boutiqueId)!;
      group.items.push(item);
      group.total += item.prix_total;
    });
    return map;
  }

  formatPrice(prix: number): string {
    return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA',
    minimumFractionDigits: 0
  }).format(prix);
  }

  isUpdating(produitId: string): boolean {
    return this.updatingItems.has(produitId);
  }

  allerAuPanier(): void {
    this.close();
    // Naviguer vers la page panier complète si vous voulez garder les deux
  }
}
