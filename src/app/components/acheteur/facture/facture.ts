// import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { RouterModule } from '@angular/router';
// import { Subject, takeUntil } from 'rxjs';

// import { CommandeService, CommandesResponse, CommandeListe } from '../../../services/acheteur/commande/commande.service';
// import { ToastService } from '../../../services/utils/toast/toast.service';

// @Component({
//   selector: 'app-commandes-payees',
//   standalone: true,
//   imports: [CommonModule, RouterModule],
//   templateUrl: './facture.html',
//   styleUrls: ['./facture.css']
// })
// export class Facture implements OnInit, OnDestroy {
//   commandes: CommandeListe[] = [];
//   loading = false;
//   filtreActuel: string = 'tous'; // 'tous', 'PAYEE', 'RECUPEREE', 'LIVREE'

//   private destroy$ = new Subject<void>();

//   constructor(
//     private commandeService: CommandeService,
//     private toastService: ToastService,
//     private cdr: ChangeDetectorRef
//   ) {}

//   ngOnInit(): void {
//     this.chargerFactures();
//   }

//   ngOnDestroy(): void {
//     this.destroy$.next();
//     this.destroy$.complete();
//   }

//   /**
//    * Charger les factures (commandes avec statut PAYEE, RECUPEREE, LIVREE)
//    */
//   chargerFactures(): void {
//     this.loading = true;
//     this.cdr.markForCheck();

//     // Construire les filtres en fonction du filtre actuel
//     const filtres: any = {
//       limit: 50,
//       tri: 'date_desc'
//     };

//     // Si un filtre spécifique est sélectionné (pas 'tous')
//     if (this.filtreActuel !== 'tous') {
//       filtres.statut = this.filtreActuel;
//     } else {
//       // Pour 'tous', on prend PAYEE, RECUPEREE, LIVREE
//       filtres.statut = 'PAYEE,RECUPEREE,LIVREE';
//     }

//     this.commandeService.getCommandes(filtres).subscribe({
//       next: (response: CommandesResponse) => {
//         this.commandes = response.commandes;
//         this.loading = false;
//         this.cdr.markForCheck();
//       },
//       error: (err) => {
//         console.error('Erreur chargement factures:', err);
//         this.toastService.show('Erreur lors du chargement des factures', 'error');
//         this.loading = false;
//         this.cdr.markForCheck();
//       }
//     });
//   }

//   /**
//    * Filtrer les factures par statut
//    */
//   filtrerParStatut(statut: string): void {
//     this.filtreActuel = statut;
//     this.chargerFactures();
//   }

//   /**
//    * Formater le prix
//    */
//   formatPrice(prix: number): string {
//     return new Intl.NumberFormat('fr-MG', {
//       style: 'currency',
//       currency: 'MGA',
//       minimumFractionDigits: 0
//     }).format(prix);
//   }

//   /**
//    * Obtenir la classe CSS pour le statut
//    */
//   getStatutClass(statut: string): string {
//     const classes: { [key: string]: string } = {
//       'PAYEE': 'statut-payee',
//       'RECUPEREE': 'statut-recuperee',
//       'LIVREE': 'statut-livree'
//     };
//     return classes[statut] || 'statut-payee';
//   }

//   /**
//    * Obtenir le libellé du statut
//    */
//   getStatutLabel(statut: string): string {
//     const labels: { [key: string]: string } = {
//       'PAYEE': 'Payée',
//       'RECUPEREE': 'Récupérée',
//       'LIVREE': 'Livrée'
//     };
//     return labels[statut] || statut;
//   }
// }

import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { CommandeService, CommandesResponse, CommandeListe } from '../../../services/acheteur/commande/commande.service';
import { ToastService } from '../../../services/utils/toast/toast.service';

// ─── jsPDF (npm install jspdf) ───────────────────────────────────────────────
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';   // npm install jspdf-autotable

@Component({
  selector: 'app-commandes-payees',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './facture.html',
  styleUrls: ['./facture.css']
})
export class Facture implements OnInit, OnDestroy {
  commandes: CommandeListe[] = [];
  loading = false;
  filtreActuel: string = 'tous';

  /** Référence de la commande en cours de génération */
  generatingPdf: string | null = null;

  /** URL blob sécurisée pour l'iframe */
  pdfPreviewUrl: SafeResourceUrl | null = null;

  /** Blob brut pour le téléchargement */
  private pdfBlob: Blob | null = null;

  /** Commande affichée dans la modale */
  commandeSelectionnee: CommandeListe | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private commandeService: CommandeService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.chargerFactures();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this._revokeUrl();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Chargement des factures
  // ─────────────────────────────────────────────────────────────────────────

  chargerFactures(): void {
    this.loading = true;
    this.cdr.markForCheck();

    const filtres: any = { limit: 50, tri: 'date_desc' };
    filtres.statut = this.filtreActuel !== 'tous' ? this.filtreActuel : 'PAYEE,RECUPEREE,LIVREE';

    this.commandeService.getCommandes(filtres).subscribe({
      next: (response: CommandesResponse) => {
        this.commandes = response.commandes;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Erreur chargement factures:', err);
        this.toastService.show('Erreur lors du chargement des factures', 'error');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  filtrerParStatut(statut: string): void {
    this.filtreActuel = statut;
    this.chargerFactures();
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Génération PDF + modale de prévisualisation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Génère le PDF en mémoire, crée un blob URL et ouvre la modale.
   */
  async ouvrirPreviewPdf(commande: CommandeListe): Promise<void> {
    this.generatingPdf = commande._id;
    this.cdr.markForCheck();

    try {
      const blob = await this._genererPdfBlob(commande);
      this._revokeUrl();

      this.pdfBlob = blob;
      const objectUrl = URL.createObjectURL(blob);
      this.pdfPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);
      this.commandeSelectionnee = commande;
    } catch (e) {
      console.error('Erreur génération PDF:', e);
      this.toastService.show('Impossible de générer la facture', 'error');
    } finally {
      this.generatingPdf = null;
      this.cdr.markForCheck();
    }
  }

  /** Télécharge le PDF déjà généré. */
  telechargerPdf(): void {
    if (!this.pdfBlob || !this.commandeSelectionnee) return;

    const ref = this.commandeSelectionnee._id.slice(-8).toUpperCase();
    const url = URL.createObjectURL(this.pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Facture_${ref}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Ferme la modale si on clique sur l'overlay. */
  fermerPreview(event: MouseEvent): void {
    this.fermerPreviewDirect();
  }

  fermerPreviewDirect(): void {
    this._revokeUrl();
    this.pdfPreviewUrl = null;
    this.pdfBlob = null;
    this.commandeSelectionnee = null;
    this.cdr.markForCheck();
  }

  private _revokeUrl(): void {
    if (this.pdfPreviewUrl) {
      // Extrait l'URL brute depuis le SafeResourceUrl
      const raw = (this.pdfPreviewUrl as any)?.changingThisBreaksApplicationSecurity;
      if (raw?.startsWith('blob:')) URL.revokeObjectURL(raw);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Construction du PDF avec jsPDF
  // ─────────────────────────────────────────────────────────────────────────

  private async _genererPdfBlob(commande: CommandeListe): Promise<Blob> {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210; // largeur A4
    const ref = commande._id.slice(-8).toUpperCase();
    const dateStr = new Date(commande.date).toLocaleDateString('fr-MG', {
      day: '2-digit', month: 'long', year: 'numeric'
    });

    // ── Couleur selon statut ──────────────────────────────────────────────
    const statutColors: Record<string, [number, number, number]> = {
      PAYEE:     [37,  99,  235],
      RECUPEREE: [124, 58,  237],
      LIVREE:    [5,   150, 105],
    };
    const [r, g, b] = statutColors[commande.statut] ?? [37, 99, 235];

    // ── Bandeau en-tête coloré ────────────────────────────────────────────
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, W, 38, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('FACTURE', 14, 16);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Réf. : #${ref}`, 14, 24);
    doc.text(`Statut : ${this.getStatutLabel(commande.statut).toUpperCase()}`, 14, 30);

    // Logo / nom app (à droite)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Centre Commercial', W - 14, 14, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('https://frontend-mean-57x3.onrender.com', W - 14, 20, { align: 'right' });

    // ── Bloc infos boutique + date ────────────────────────────────────────
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Boutique', 14, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(commande.boutique, 14, 57);

    doc.setFont('helvetica', 'bold');
    doc.text('Date', W - 14 - 50, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(dateStr, W - 14 - 50, 57);

    // Ligne séparatrice
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(14, 63, W - 14, 63);

    // ── Tableau des produits ──────────────────────────────────────────────
    const lignes = commande.apercu_produits.map(p => [
      p.nom,
      `x${p.quantite}`,
      this.formatPrice(p.prix_unitaire),
      this.formatPrice(p.prix_unitaire * p.quantite),
    ]);

    // Si la commande a plus de produits que l'aperçu, on le note
    if (commande.nombre_articles > commande.apercu_produits.length) {
      const reste = commande.nombre_articles - commande.apercu_produits.length;
      lignes.push([`... et ${reste} autre(s) article(s)`, '', '', '']);
    }

    autoTable(doc, {
      startY: 68,
      head: [['Produit', 'Qté', 'Prix unitaire', 'Sous-total']],
      body: lignes,
      theme: 'striped',
      headStyles: {
        fillColor: [r, g, b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 42, halign: 'right' },
        3: { cellWidth: 42, halign: 'right' },
      },
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9, cellPadding: 3 },
    });

    // ── Bloc total ────────────────────────────────────────────────────────
    const finalY: number = (doc as any).lastAutoTable.finalY + 6;

    // Fond gris clair pour le total
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(W - 14 - 70, finalY, 70, 16, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('TOTAL TTC', W - 14 - 66, finalY + 6.5);

    doc.setFontSize(13);
    doc.setTextColor(r, g, b);
    doc.text(this.formatPrice(commande.montant_total), W - 14 - 4, finalY + 10, { align: 'right' });

    // ── Mentions légales / pied de page ───────────────────────────────────
    const pageH = 297;
    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageH - 20, W - 14, pageH - 20);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Ce document est une facture officielle générée automatiquement par MonApp Marketplace.',
      W / 2, pageH - 14, { align: 'center' }
    );
    doc.text(
      `Document généré le ${new Date().toLocaleDateString('fr-MG')}`,
      W / 2, pageH - 9, { align: 'center' }
    );

    return doc.output('blob');
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  Utilitaires
  // ─────────────────────────────────────────────────────────────────────────

  formatPrice(prix: number): string {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(prix);
  }

  getStatutClass(statut: string): string {
    const classes: { [key: string]: string } = {
      'PAYEE':     'statut-payee',
      'RECUPEREE': 'statut-recuperee',
      'LIVREE':    'statut-livree'
    };
    return classes[statut] || 'statut-payee';
  }

  getStatutLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'PAYEE':     'Payée',
      'RECUPEREE': 'Récupérée',
      'LIVREE':    'Livrée'
    };
    return labels[statut] || statut;
  }
}
