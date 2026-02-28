import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { CommandeService, CommandesResponse, CommandesFilters, CommandeListe } from '../../../services/acheteur/commande/commande.service';
import { ToastService } from '../../../services/utils/toast/toast.service';
import { LivraisonCarteComponent } from '../carte/carte';

// Interface pour suivre le mode de livraison de chaque commande
interface CommandeLivraison {
  id: string;
  modeLivraison: 'recuperer' | 'livrer' | null;
  positionLivraison?: {
    lat: number;
    lng: number;
    adresse?: string;
    distance?: number;
    frais?: number;
  };
}

@Component({
  selector: 'app-mes-commandes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LivraisonCarteComponent],
  templateUrl: './commandes.html',
  styleUrls: ['./commandes.css']
})
export class Commandes implements OnInit, OnDestroy {
  commandes: CommandeListe[] = [];
  loading = false;

   // ✅ État de la commande en cours de configuration
  commandeEnCours: CommandeLivraison = {
    id: '',
    modeLivraison: null
  };

  // État de la carte
  carteOuverte = false;
  commandeIdPourCarte: string = '';

  filtres: CommandesFilters = {
    statut: '',
    page: 1,
    limit: 50, // Afficher plus de commandes par page
    tri: 'date_desc'
  };

  private destroy$ = new Subject<void>();

  constructor(
    private commandeService: CommandeService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.chargerCommandes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  chargerCommandes(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.commandeService.getCommandes(this.filtres).subscribe({
      next: (response: CommandesResponse) => {
        this.commandes = response.commandes;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur chargement commandes:', err);
        this.toastService.show('Erreur lors du chargement des commandes', 'error');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  appliquerFiltres(): void {
    this.filtres.page = 1;
    this.chargerCommandes();
  }

  resetFiltres(): void {
    this.filtres.statut = '';
    this.filtres.page = 1;
    this.chargerCommandes();
  }

  /**
   * ✅ Choisir le mode "Récupérer"
   */
  choisirRecuperer(commande: CommandeListe): void {
    console.log('📦 Mode récupérer choisi pour commande:', commande._id);

    // [MODIFIÉ] On réinitialise positionLivraison pour effacer les frais affichés
    this.commandeEnCours = {
      id: commande._id,
      modeLivraison: 'recuperer',
      positionLivraison: undefined // reset des infos de livraison
    };

    this.toastService.show('Mode récupération sélectionné', 'info');
    this.cdr.markForCheck();
  }

  /**
   * ✅ Choisir le mode "Livrer"
   */
  choisirLivrer(commande: CommandeListe): void {
    console.log('🚚 Mode livrer choisi pour commande:', commande._id);

    this.commandeEnCours = {
      id: commande._id,
      modeLivraison: 'livrer'
    };

    this.toastService.show('Mode livraison sélectionné', 'info');
    this.cdr.markForCheck();
  }

  /**
   * Ouvrir la carte pour sélectionner la position
   */
  ouvrirCarteLivraison(commande: CommandeListe): void {
    console.log('Avant ouverture → carteOuverte était:', this.carteOuverte);
  this.commandeIdPourCarte = commande._id;
  this.carteOuverte = true;
  console.log('Après ouverture → carteOuverte:', this.carteOuverte);
  this.cdr.detectChanges();   // force souvent la détection
  }

  /**
   * Fermer la carte
   */
  fermerCarte(): void {
    this.carteOuverte = false;
    this.commandeIdPourCarte = '';
    this.cdr.markForCheck();
  }

  /**
   * Position confirmée depuis la carte
   */
  // Modifier onPositionConfirmee
  onPositionConfirmee(event: {lat: number, lng: number, commandeId: string, livraison?: {adresse: string, distance: number, frais: number}}): void {
    console.log('📍 Position confirmée:', event);

    // Sauvegarder la position avec toutes les infos de livraison
    this.commandeEnCours = {
      ...this.commandeEnCours,
      positionLivraison: {
        lat: event.lat,
        lng: event.lng,
        adresse: event.livraison?.adresse,
        distance: event.livraison?.distance,
        frais: event.livraison?.frais
      }
    };

    this.toastService.show('Position de livraison enregistrée', 'success');
    this.cdr.markForCheck();
  }

  payerCommande(commande: CommandeListe): void {
    if (commande.statut !== 'EN_ATTENTE') {
      this.toastService.show('Cette commande ne peut pas être payée', 'warning');
      return;
    }

    // ✅ Vérifier qu'un mode de livraison a été choisi pour CETTE commande
    if (this.commandeEnCours.id !== commande._id || !this.commandeEnCours.modeLivraison) {
      alert('Veuillez d\'abord choisir un mode de réception (Récupérer ou Livrer)');
      return;
    }

    // Si mode livraison, vérifier que la position est sélectionnée
    if (this.commandeEnCours.modeLivraison === 'livrer' && !this.commandeEnCours.positionLivraison) {
      alert('Veuillez sélectionner une position de livraison sur la carte');
      return;
    }

    // Confirmation native
    const message = this.commandeEnCours.modeLivraison === 'livrer'
      ? `Confirmer le paiement de ${this.formatPrice(commande.montant_total)} (dont frais de livraison: ${this.formatPrice(this.commandeEnCours.positionLivraison?.frais || 0)}) ?`
      : `Confirmer le paiement de ${this.formatPrice(commande.montant_total)} ?`;

    if (!confirm(message)) {
      return;
    }

    // Afficher le loading
    this.loading = true;
    this.cdr.markForCheck();

    // Préparer les données pour le backend
    const paiementData: any = {
      commandeId: commande._id
    };

    // Ajouter les données de livraison si nécessaire
    if (this.commandeEnCours.modeLivraison === 'livrer' && this.commandeEnCours.positionLivraison) {
      paiementData.livraison = {
        adresse: this.commandeEnCours.positionLivraison.adresse || 'Adresse non spécifiée',
        distance: this.commandeEnCours.positionLivraison.distance || 0,
        frais: this.commandeEnCours.positionLivraison.frais || 0
      };
    }

    // Appel API pour payer la commande
    this.commandeService.payerCommande(paiementData).subscribe({
      next: (response) => {
        this.loading = false;
        this.toastService.show('✅ Paiement effectué avec succès !', 'success');

        // Réinitialiser l'état de la commande en cours
        if (this.commandeEnCours.id === commande._id) {
          this.commandeEnCours = { id: '', modeLivraison: null };
        }

        this.chargerCommandes();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        console.error('Erreur paiement:', err);
        this.toastService.show(err.error?.message || '❌ Erreur lors du paiement', 'error');
        this.cdr.markForCheck();
      }
    });
  }

  formatPrice(prix: number): string {
    return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA',
    minimumFractionDigits: 0
  }).format(prix);
  }

  getStatutClass(statut: string): string {
    const classes: { [key: string]: string } = {
      'EN_ATTENTE': 'statut-attente',
      'PAYEE': 'statut-payee',
      'LIVREE': 'statut-livree',
      'ANNULEE': 'statut-annulee'
    };
    return classes[statut] || '';
  }

  getStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'EN_ATTENTE': 'En attente',
      'PAYEE': 'Payée',
      'LIVREE': 'Livrée',
      'ANNULEE': 'Annulée'
    };
    return labels[statut] || statut;
  }
}
