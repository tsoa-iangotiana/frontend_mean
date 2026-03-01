import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BoutiqueContextService } from '../context/boutique.context.service';

export interface PaiementLoyer {
  _id?: string;
  montant: number;
  date_paiement: Date;
  date_fin: Date;
  periode: 'mensuel' | 'trimestriel' | 'annuel';
  statut?: 'ACTIF' | 'EXPIRE';
}

export interface SituationLoyer {
  boutique: any | string;
  box: string;
  loyer_mensuel: number;
  situation: {
    statut: 'A_JOUR' | 'RETARD';
    dernier_paiement: Date | null;
    prochaine_echeance: Date | null;
    jours_restants: number;
    periode_en_cours: string | null;
    montant_paye: number;
  };
}

export interface HistoriquePaiements {
  total_paiements: number;
  montant_total: number;
  paiements: PaiementLoyer[];
}

export interface PaiementRequest {
  periode: 'mensuel' | 'trimestriel' | 'annuel';
  montant?: number;
}

@Injectable({
  providedIn: 'root'
})
export class LoyerService {
  private apiUrl = `${environment.apiUrl}/loyer`;

  constructor(private http: HttpClient,private boutiqueContext: BoutiqueContextService) {}

  /**
   * Effectuer un paiement de loyer
   */
 getSituation(): Observable<SituationLoyer> {
    // Récupérer la boutique sélectionnée depuis le contexte
    const boutique = this.boutiqueContext.getBoutiqueSelectionnee();
    
    if (!boutique?._id) {
      console.error('❌ Aucune boutique sélectionnée');
      return throwError(() => new Error('Aucune boutique sélectionnée'));
    }

    console.log('📡 Appel API situation pour boutique:', boutique.nom, 'ID:', boutique._id);

    // Créer les paramètres de requête avec l'ID de la boutique
    let params = new HttpParams().set('boutiqueId', boutique._id);

    // Passer l'ID en paramètre de requête
    return this.http.get<SituationLoyer>(`${this.apiUrl}/situation`, { params }).pipe(
      catchError((error) => {
        console.error('❌ Erreur API situation:', error);
        
        let errorMessage = 'Erreur lors de la récupération de la situation';
        
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 0) {
          errorMessage = 'Impossible de contacter le serveur';
        }
        
        return throwError(() => ({
          status: error.status,
          message: errorMessage,
          originalError: error
        }));
      })
    );
  }

  // Pour le paiement
  payerLoyer(data: PaiementRequest): Observable<any> {
    const boutique = this.boutiqueContext.getBoutiqueSelectionnee();
    
    if (!boutique?._id) {
      return throwError(() => new Error('Aucune boutique sélectionnée'));
    }

    // Ajouter l'ID de la boutique au body de la requête
    const payload = {
      ...data,
      boutiqueId: boutique._id
    };

    return this.http.post(`${this.apiUrl}/payer`, payload).pipe(
      catchError((error) => {
        console.error('❌ Erreur API paiement:', error);
        return throwError(() => error);
      })
    );
  }

  // Pour l'historique
  getHistorique(): Observable<any> {
    const boutique = this.boutiqueContext.getBoutiqueSelectionnee();
    
    if (!boutique?._id) {
      return throwError(() => new Error('Aucune boutique sélectionnée'));
    }

    let params = new HttpParams().set('boutiqueId', boutique._id);

    return this.http.get(`${this.apiUrl}/historique`, { params }).pipe(
      catchError((error) => {
        console.error('❌ Erreur API historique:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Formater le statut pour l'affichage
   */
  getStatutBadgeClass(statut: string): string {
    switch(statut) {
      case 'A_JOUR':
      case 'ACTIF':
        return 'bg-green-100 text-green-800';
      case 'RETARD':
        return 'bg-red-100 text-red-800';
      case 'EXPIRE':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  }

  /**
   * Formater le statut pour l'affichage en français
   */
  getStatutLibelle(statut: string): string {
    switch(statut) {
      case 'A_JOUR':
        return 'À jour';
      case 'RETARD':
        return 'En retard';
      case 'ACTIF':
        return 'Actif';
      case 'EXPIRE':
        return 'Expiré';
      default:
        return statut;
    }
  }

  /**
   * Formater la période pour l'affichage
   */
  getPeriodeLibelle(periode: string): string {
    switch(periode) {
      case 'mensuel':
        return 'Mensuel';
      case 'trimestriel':
        return 'Trimestriel';
      case 'annuel':
        return 'Annuel';
      default:
        return periode;
    }
  }
}