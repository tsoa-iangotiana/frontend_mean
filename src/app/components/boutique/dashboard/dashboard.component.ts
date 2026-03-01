import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../services/auth';
import {
  DashboardResponsableService,
  DashboardResponsable,
  BoutiqueResume,
  PerformanceBoutique,
  EvolutionJournaliere,
  TopProduit,
  TopClient,
  HeureDePointe,
} from '../../../services/boutique/dashboard/dashboard.service';

@Component({
  selector: 'app-dashboard-responsable',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardResponsableComponent implements OnInit {

  // ── États ──────────────────────────────────────────────────────────────────
  loading       = true;
  errorMessage  = '';

  // ── Données ────────────────────────────────────────────────────────────────
  currentUser: User | null = null;
  dashboard:   DashboardResponsable | null = null;

  // Boutique mise en avant dans le tableau comparatif (optionnel)
  boutiqueMiseEnAvant: PerformanceBoutique | null = null;

  constructor(
    private authService:              AuthService,
    private dashboardService:         DashboardResponsableService,
    private router:                   Router,
    private cdr:                      ChangeDetectorRef
  ) {}

  // ── Cycle de vie ───────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    console.log('🏁 Initialisation DashboardResponsable');

    // Protection SSR
    if (!this.authService.isBrowser()) {
      console.log('🖥️ SSR - aucune action');
      return;
    }

    // Vérification auth
    await this.authService.initializeAuth();

    if (!this.authService.isLoggedIn()) {
      console.log('🔒 Non authentifié - Redirection login');
      this.router.navigate(['/login']);
      return;
    }

    this.currentUser = this.authService.getCurrentUser();
    console.log('👤 Utilisateur connecté :', this.currentUser);

    if (this.currentUser) {
      this.chargerDashboard();
    } else {
      console.error('❌ Impossible de récupérer l\'utilisateur connecté');
      this.loading      = false;
      this.errorMessage = 'Erreur de session utilisateur';
      this.cdr.detectChanges();
    }
  }

  // ── Chargement des données ─────────────────────────────────────────────────

  chargerDashboard(): void {
    if (!this.currentUser) return;

    console.log('📊 Chargement dashboard pour responsable :', this.currentUser._id);
    this.loading = true;

    this.dashboardService.getDashboardResponsable(this.currentUser._id).subscribe({
      next: (data) => {
        console.log('✅ Dashboard reçu :', data);
        this.dashboard = data;

        // Mettre en avant la boutique avec le meilleur CA par défaut
        if (data.performances_par_boutique?.length) {
          console.log('⭐ Boutique mise en avant :', data.performances_par_boutique.length);
          this.boutiqueMiseEnAvant = data.performances_par_boutique[0];
        }

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur dashboard :', error);

        if (error.status === 401) {
          console.log('🔒 Token expiré - Déconnexion forcée');
          this.authService.logout();
          this.router.navigate(['/login']);
          return;
        }

        this.loading      = false;
        this.errorMessage = error.error?.message || 'Erreur lors du chargement du dashboard';
        this.cdr.detectChanges();
      }
    });
  }

  // ── Helpers template ───────────────────────────────────────────────────────

  /** Formate un montant en Ar */
  formatMontant(montant: number): string {
    return new Intl.NumberFormat('fr-MG', {
      style:    'currency',
      currency: 'MGA',
      maximumFractionDigits: 0,
    }).format(montant);
  }

  /** Retourne la classe CSS selon le signe de l'évolution */
  evolutionClass(evolution: string): string {
    if (evolution === 'N/A') return 'text-gray-400';
    return evolution.startsWith('-') ? 'text-red-500' : 'text-green-500';
  }

  /** Retourne le label lisible d'un statut */
  getStatutLabel(statut: string): string {
    const map: Record<string, string> = {
      EN_ATTENTE: 'En attente',
      PAYEE:      'Payée',
      LIVREE:     'Livrée',
      RECUPEREE:  'Récupérée',
      ANNULEE:    'Annulée',
    };
    return map[statut] || statut;
  }

  /** Retourne la couleur Tailwind d'un badge statut */
  getStatutBadgeClass(statut: string): string {
    const map: Record<string, string> = {
      EN_ATTENTE: 'bg-orange-100 text-orange-700',
      PAYEE:      'bg-blue-100 text-blue-700',
      LIVREE:     'bg-green-100 text-green-700',
      RECUPEREE:  'bg-teal-100 text-teal-700',
      ANNULEE:    'bg-red-100 text-red-700',
    };
    return map[statut] || 'bg-gray-100 text-gray-700';
  }

  /** Retourne le total de commandes en attente (toutes boutiques) */
  get totalEnAttente(): number {
    return this.dashboard?.resume.repartition_statuts.EN_ATTENTE ?? 0;
  }

  /** Calcule le pourcentage d'une boutique dans le CA global */
  partBoutiquePct(boutique: PerformanceBoutique): number {
    const total = this.dashboard?.resume.ca_total ?? 0;
    if (!total) return 0;
    return Math.round((boutique.ca_total / total) * 100);
  }

  /** Calcule le % d'un statut par rapport au total des commandes */
  getPct(count: number): number {
    const total = this.dashboard?.resume.total_commandes ?? 0;
    if (!total) return 0;
    return Math.round((count / total) * 100);
  }

  /** Heure de pointe avec le plus de commandes */
  get heurePicMax(): HeureDePointe | null {
    const heures = this.dashboard?.heures_de_pointe;
    if (!heures?.length) return null;
    return heures.reduce((prev, cur) =>
      cur.nb_commandes > prev.nb_commandes ? cur : prev
    );
  }

  /** Recharge le dashboard */
  rafraichir(): void {
    this.chargerDashboard();
  }

  // Accès typé pour le template
  get boutiquesResume(): BoutiqueResume[] {
    return this.dashboard?.boutiques ?? [];
  }

  get performanceParBoutique(): PerformanceBoutique[] {
    return this.dashboard?.performances_par_boutique ?? [];
  }

  get topProduits(): TopProduit[] {
    return this.dashboard?.top_produits ?? [];
  }

  get topClients(): TopClient[] {
    return this.dashboard?.top_clients ?? [];
  }

  get evolutionJournaliere(): EvolutionJournaliere[] {
    return this.dashboard?.evolution_journaliere ?? [];
  }

  get heuresDePointe(): HeureDePointe[] {
    return this.dashboard?.heures_de_pointe ?? [];
  }

  /** Valeur max du CA sur 30j pour normaliser les barres */
  getMaxCA(): number {
    const vals = this.evolutionJournaliere.map(d => d.ca);
    return vals.length ? Math.max(...vals) : 1;
  }

  /** Hauteur d'une barre CA en % (min 2%) */
  getBarHeight(ca: number): number {
    const max = this.getMaxCA();
    return max ? Math.max(2, Math.round((ca / max) * 100)) : 2;
  }

  /** Valeur max commandes par heure */
  getMaxHeure(): number {
    const vals = this.heuresDePointe.map(h => h.nb_commandes);
    return vals.length ? Math.max(...vals) : 1;
  }

  /** Hauteur d'une barre heure en % */
  getHeureHeight(nb: number): number {
    const max = this.getMaxHeure();
    return max ? Math.max(4, Math.round((nb / max) * 100)) : 4;
  }
  formatDate(dateStr: string): string {
      const d = new Date(dateStr);
      const mois = [
        'janvier','février','mars','avril','mai','juin',
        'juillet','août','septembre','octobre','novembre','décembre'
      ];
      const j   = d.getDate().toString().padStart(2, '0');
      const m   = mois[d.getMonth()];
      const y   = d.getFullYear();
      const hh  = d.getHours().toString().padStart(2, '0');
      const min = d.getMinutes().toString().padStart(2, '0');
      return `${j} ${m} ${y} à ${hh}:${min}`;
    }
  }