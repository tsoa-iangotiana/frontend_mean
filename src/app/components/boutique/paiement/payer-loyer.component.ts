import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { LoyerService, PaiementRequest, SituationLoyer } from '../../../services/boutique/paiement/loyer.service';
import { BoutiqueContextService } from '../../../services/boutique/context/boutique.context.service';
import { ToastService } from '../../../services/utils/toast/toast.service';
import { Router, RouterModule } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-payer-loyer',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './payer-loyer.component.html',
  styleUrls: ['./payer-loyer.component.css'],
  // OnPush : Angular ne vérifie ce composant que sur événement explicite (markForCheck)
  // Cela évite le NG0100 car les mises à jour sont planifiées, pas forcées.
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayerLoyerComponent implements OnInit, OnDestroy {
  paiementForm: FormGroup;
  situation!: SituationLoyer;
  isLoading = false;
  isSubmitting = false;
  isContextReady = false;
  boutiqueSelectionnee: any = null;
  
  private subscriptions: Subscription = new Subscription();

  periodeOptions = [
    { value: 'mensuel', label: 'Mensuel' },
    { value: 'trimestriel', label: 'Trimestriel' },
    { value: 'annuel', label: 'Annuel' },
  ];

  constructor(
    private fb: FormBuilder,
    private loyerService: LoyerService,
    private boutiqueContext: BoutiqueContextService,
    private toastr: ToastService,
    private authService: AuthService,
    public router: Router,
    private cdr: ChangeDetectorRef
  ) {
    this.paiementForm = this.fb.group({
      periode: ['mensuel', Validators.required],
      montant: ['', [Validators.required, Validators.min(1)]],
    });
  }

  async ngOnInit(): Promise<void> {
    if (!this.authService.isBrowser()) return;

    await this.authService.initializeAuth();

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    // BehaviorSubject émet automatiquement sa valeur courante à chaque nouveau subscriber :
    // pas besoin de startWith(). Le startWith redondant causait une double émission
    // et une mutation d'état pendant la phase de vérification Angular → NG0100.
    this.subscriptions.add(
      this.boutiqueContext.boutiqueSelectionnee$
        .pipe(filter((boutique) => !!boutique))
        .subscribe((boutique) => {
          console.log('🏪 Boutique disponible:', boutique!.nom);
          this.boutiqueSelectionnee = boutique;
          this.isContextReady = true;
          this.loadSituation();
          // markForCheck() : planifie la détection au prochain cycle → pas de conflit NG0100
          this.cdr.markForCheck();
        })
    );

    this.subscriptions.add(
      this.boutiqueContext.loading$.subscribe((loading) => {
        this.isLoading = loading;
        this.cdr.markForCheck(); // idem
      })
    );

    this.subscriptions.add(
      this.paiementForm.get('periode')?.valueChanges.subscribe((periode) => {
        this.updateMontantSuggestion(periode);
      }) || new Subscription()
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadSituation(): void {
    if (!this.boutiqueSelectionnee) {
      this.toastr.show('Veuillez sélectionner une boutique', 'Erreur');
      return;
    }

    this.isLoading = true;

    this.loyerService.getSituation().subscribe({
      next: (data) => {
        this.situation = data;

        if (data.boutique !== this.boutiqueSelectionnee.nom) {
          console.warn('Incohérence: La situation ne correspond pas à la boutique sélectionnée');
        }

        this.paiementForm.patchValue({ montant: data.loyer_mensuel });
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Erreur chargement situation:', error);

        if (error.status === 401) {
          this.toastr.show('Session expirée, veuillez vous reconnecter', 'Erreur');
          this.router.navigate(['/auth/login']);
        } else if (error.status === 403) {
          this.toastr.show('Accès non autorisé à cette boutique', 'Erreur');
        } else if (error.status === 404) {
          this.toastr.show('Boutique non trouvée', 'Erreur');
          this.router.navigate(['/boutique/selection']);
        } else {
          this.toastr.show('Erreur lors du chargement de la situation', 'Erreur');
        }

        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  updateMontantSuggestion(periode: string): void {
    if (!this.situation) return;

    const loyerMensuel = this.situation.loyer_mensuel;
    let montantSuggere = loyerMensuel;

    switch (periode) {
      case 'trimestriel':
        montantSuggere = loyerMensuel * 3;
        break;
      case 'annuel':
        montantSuggere = loyerMensuel * 12;
        break;
      default:
        montantSuggere = loyerMensuel;
    }

    this.paiementForm.patchValue({ montant: montantSuggere });
  }

  onSubmit(): void {
    if (!this.boutiqueSelectionnee) {
      this.toastr.show('Veuillez sélectionner une boutique', 'Erreur');
      this.router.navigate(['/boutique/selection']);
      return;
    }

    if (this.paiementForm.invalid) {
      Object.keys(this.paiementForm.controls).forEach((key) => {
        this.paiementForm.get(key)?.markAsTouched();
      });

      if (this.paiementForm.get('montant')?.hasError('min')) {
        this.toastr.show('Le montant doit être supérieur à 0', 'Erreur');
      } else {
        this.toastr.show('Veuillez remplir tous les champs correctement', 'Erreur');
      }
      return;
    }

    this.isSubmitting = true;
    const paiementData: PaiementRequest = this.paiementForm.value;

    console.log('Paiement en cours pour la boutique:', this.boutiqueSelectionnee.nom);

    this.loyerService.payerLoyer(paiementData).subscribe({
      next: () => {
        this.toastr.show('Paiement enregistré avec succès', 'Succès');
        this.isSubmitting = false;
        this.loadSituation();
        this.cdr.markForCheck();

        setTimeout(() => {
          this.router.navigate(['/boutique/historique-paiement']);
        }, 2000);
      },
      error: (error) => {
        console.error('Erreur paiement:', error);

        let messageErreur = error.error?.message || 'Erreur lors du paiement';

        if (error.status === 400) {
          if (error.error?.message?.includes('box')) {
            messageErreur = 'Aucun box assigné à cette boutique';
          } else if (error.error?.message?.includes('période')) {
            messageErreur = 'Période de paiement invalide';
          }
        } else if (error.status === 401) {
          messageErreur = 'Session expirée, veuillez vous reconnecter';
          setTimeout(() => this.router.navigate(['/auth/login']), 2000);
        } else if (error.status === 403) {
          messageErreur = "Vous n'êtes pas autorisé à effectuer cette action";
        }

        this.toastr.show(messageErreur, 'Erreur');
        this.isSubmitting = false;
        this.cdr.markForCheck();
      },
    });
  }

  getStatutClass(): string {
    if (!this.situation?.situation?.statut) return '';
    return this.loyerService.getStatutBadgeClass(this.situation.situation.statut);
  }

  getStatutLibelle(): string {
    if (!this.situation?.situation?.statut) return '';
    return this.loyerService.getStatutLibelle(this.situation.situation.statut);
  }

  getPeriodeLibelle(periode: string): string {
    return this.loyerService.getPeriodeLibelle(periode);
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  formatMontant(montant: number): string {
    if (!montant && montant !== 0) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(montant);
  }

  getNomBoutique(): string {
    return this.boutiqueSelectionnee?.nom || 'Non sélectionnée';
  }
  
}