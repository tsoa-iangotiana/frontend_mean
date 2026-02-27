import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { PanierService, Panier, PanierItem } from '../../../services/acheteur/panier/panier.service';
import { ToastService } from '../../../services/utils/toast/toast.service';
import { CommandeService } from '../../../services/acheteur/commande/commande.service';

// Ajoute cette interface avant le component
interface GroupeBoutique {
  boutique: {
    _id: string;
    nom: string;
  };
  items: PanierItem[];
  total: number;
}

@Component({
  selector: 'app-panier',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './panier.html',
  styleUrls: ['./panier.css']
})
export class PanierComponent implements OnInit, OnDestroy {
  panier: Panier | null = null;
  loading = false;
  updatingItems = new Set<string>();

  // ✅ Nouvelle propriété
  aDesCommandesEnAttente = false;
  verificationCommandesEnCours = false;

  private destroy$ = new Subject<void>();

  constructor(
    private panierService: PanierService,
    private toastService: ToastService,
    private commandeService: CommandeService,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.panierService.loading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => this.loading = loading);

    this.panierService.panier$
      .pipe(takeUntil(this.destroy$))
      .subscribe(panier => {
        this.panier = panier;
        // Dès qu'on a un panier, on vérifie les commandes en attente
        if (panier && panier.nombre_articles > 0) {
          this.verifierCommandesEnAttente();
        }
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  /**
   * ✅ Vérifier si l'utilisateur a des commandes en attente
   */
  verifierCommandesEnAttente(): void {
    this.verificationCommandesEnCours = true;
    this.commandeService.hasCommandesEnAttente().subscribe({
      next: (hasEnAttente) => {
        this.aDesCommandesEnAttente = hasEnAttente;
        this.verificationCommandesEnCours = false;

        if (hasEnAttente) {
          console.log('⚠️ Des commandes sont en attente de paiement');
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur vérification commandes en attente:', err);
        this.aDesCommandesEnAttente = false;
        this.verificationCommandesEnCours = false;
        this.cdr.markForCheck();
      }
    });
  }

  /**
   * Modifier la quantité d'un produit
   */
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
      },
      error: () => {
        this.updatingItems.delete(produitId);
      }
    });
  }

  /**
   * Supprimer un produit
   */
  supprimerProduit(produitId: string): void {
    if (!confirm('Supprimer cet article du panier ?')) return;

    this.updatingItems.add(produitId);
    this.panierService.supprimerProduit(produitId).subscribe({
      next: () => {
        this.updatingItems.delete(produitId);
        this.toastService.show('Article supprimé', 'success');
      },
      error: () => {
        this.updatingItems.delete(produitId);
      }
    });
  }


  viderPanier(): void {
    if (!confirm('Vider tout le panier ?')) return;

    this.panierService.viderPanier().subscribe({
      next: () => {
        this.toastService.show('Panier vidé', 'success');

        // Recharge explicitement le panier
        setTimeout(() => {
          this.panierService.rechargerPanier();
          this.cdr.markForCheck();
        }, 100); // Petit délai pour laisser le backend se stabiliser
      },
      error: (err) => {
        this.toastService.show('Erreur lors du vidage du panier', 'error');
        this.cdr.markForCheck();
      }
    });
  }
  /**
   * Grouper les articles par boutique avec typage fort
   */
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

  /**
   * Formater le prix
   */
  formatPrice(prix: number): string {
    return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA',
    minimumFractionDigits: 0
  }).format(prix);
  }

  /**
   * Vérifier si un produit est en cours de mise à jour
   */
  isUpdating(produitId: string): boolean {
    return this.updatingItems.has(produitId);
  }


  /**
   * Valider le panier et créer les commandes
   */
  validerPanier(): void {
    // ✅ Vérification : si des commandes en attente, on bloque
    if (this.aDesCommandesEnAttente) {
      this.toastService.show(
        'Vous avez des commandes en attente de paiement. Veuillez les payer avant de créer une nouvelle commande.',
        'warning'
      );
      return;
    }
    
    // Vérifications préalables
    if (!this.panier || this.panier.nombre_articles === 0) {
      this.toastService.show('Votre panier est vide', 'warning');
      return;
    }

    // Confirmation utilisateur
    if (!confirm('Valider le panier ? Cette action est irréversible.')) return;

    // Afficher un résumé avant validation
    console.log('🛒 RÉSUMÉ DU PANIER À VALIDER:');
    console.log(`📦 ${this.panier.nombre_articles} articles`);
    console.log(`🏪 ${this.itemsParBoutique.size} boutique(s)`);
    console.log(`💰 Total: ${this.formatPrice(this.panier.total)}`);
    console.log(`💸 Économies: ${this.formatPrice(this.panier.total_economies)}`);

    // Détail par boutique
    console.log('📋 DÉTAIL PAR BOUTIQUE:');
    this.itemsParBoutique.forEach((group, boutiqueId) => {
      console.log(`  • ${group.boutique.nom}: ${group.items.length} article(s) - ${this.formatPrice(group.total)}`);
    });

    this.loading = true;
    this.cdr.markForCheck();

    // Appel au service (sans notes pour l'instant)
    this.panierService.validerPanier().subscribe({
      next: (response: any) => {
        this.loading = false;

        // ✅ Message de succès avec détails
        const message = response.nombre_commandes > 1
          ? `${response.nombre_commandes} commandes créées pour ${this.formatPrice(response.total_global)}`
          : `Commande créée avec succès (${this.formatPrice(response.total_global)})`;

        this.toastService.show(message, 'success');

        // Redirection vers la liste des boutiques
        setTimeout(() => {
          console.log('🔄 Redirection vers /boutique/all');
          this.router.navigate(['/boutique/all']);
        }, 2000);
      },
      error: (err) => {
        this.loading = false;

        // ❌ Message d'erreur
        const errorMessage = err.error?.message || 'Erreur lors de la validation';
        this.toastService.show(errorMessage, 'error');

        this.cdr.markForCheck();
      }
    });
  }
}
