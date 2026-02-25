// services/box.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Boutique } from '../../boutique/profil/profil.service';
// import { Box, BoxWithDetails, BoxHistorique, BoxStats, BoxFilters } from '../shared/interfaces/box.interface';
// shared/interfaces/box.interface.ts
export interface Box {
  _id: string;
  numero: string;
  surface: number;
  prix_loyer: number;
  libre: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface BoxHistorique {
  _id: string;
  box: string | Box;
  boutique:  Boutique;
  date_debut: string;
  date_fin?: string;
  createdAt?: string;
  updatedAt?: string;
  duree_jours?: number;
}

export interface BoxWithDetails extends Box {
  occupe_par?: Boutique ;
  historique_actif?: {
    depuis: string;
    boutique: {
      _id: string;
      nom: string;
    };
  } | null;
}

export interface BoxStats {
  total_box: number;
  box_libres: number;
  box_occupes: number;
  loyer_moyen: number;
  surface_moyenne: number;
}

export interface BoxFilters {
  libre?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  tri?: string;
}
@Injectable({
  providedIn: 'root'
})
export class BoxService {
  private apiUrl = `${environment.apiUrl}/box`;

  constructor(private http: HttpClient) {}

  // Récupérer tous les box avec filtres
  getAllBox(filters?: BoxFilters): Observable<{
    success: boolean;
    boxs: BoxWithDetails[];
    statistiques: BoxStats;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    filtres_appliques: any;
  }> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.libre !== undefined) {
        params = params.set('libre', filters.libre.toString());
      }
      if (filters.search) {
        params = params.set('search', filters.search);
      }
      if (filters.page) {
        params = params.set('page', filters.page.toString());
      }
      if (filters.limit) {
        params = params.set('limit', filters.limit.toString());
      }
      if (filters.tri) {
        params = params.set('tri', filters.tri);
      }
    }

    return this.http.get<any>(`${this.apiUrl}/list`, { params });
  }

  // Récupérer un box par ID
  getBoxById(boxId: string): Observable<{
    success: boolean;
    box: BoxWithDetails;
    historique: BoxHistorique[];
    statistiques: any;
  }> {
    return this.http.get<any>(`${this.apiUrl}/${boxId}`);
  }

  // Créer un nouveau box
  createBox(boxData: Partial<Box>): Observable<{
    success: boolean;
    message: string;
    box: Box;
  }> {
    return this.http.post<any>(`${this.apiUrl}/insert-box`, boxData);
  }

  // Mettre à jour un box
  updateBox(boxId: string, boxData: Partial<Box>): Observable<{
    success: boolean;
    message: string;
    box: Box;
  }> {
    return this.http.put<any>(`${this.apiUrl}/${boxId}`, boxData);
  }

  // Supprimer un box
  deleteBox(boxId: string): Observable<{
    success: boolean;
    message: string;
  }> {
    return this.http.delete<any>(`${this.apiUrl}/${boxId}`);
  }

  // Attribuer un box à une boutique
  attribuerBox(boxId: string, data: { boutiqueId: string; date_debut?: string }): Observable<{
    success: boolean;
    message: string;
    attribution: any;
  }> {
    return this.http.post<any>(`${this.apiUrl}/${boxId}/attribuer`, data);
  }

  // Libérer un box
  libererBox(boxId: string, data?: { date_fin?: string }): Observable<{
    success: boolean;
    message: string;
    liberation: any;
  }> {
    return this.http.post<any>(`${this.apiUrl}/${boxId}/liberer`, data || {});
  }

  // Transférer un box à une autre boutique
  transfererBox(boxId: string, data: { nouvelleBoutiqueId: string; date_transfert?: string }): Observable<{
    success: boolean;
    message: string;
    transfert: any;
  }> {
    return this.http.post<any>(`${this.apiUrl}/${boxId}/transferer`, data);
  }

  // Récupérer l'historique d'un box
  getBoxHistorique(boxId: string, page?: number, limit?: number): Observable<{
    success: boolean;
    historique: BoxHistorique[];
    pagination: any;
  }> {
    let params = new HttpParams();
    if (page) params = params.set('page', page.toString());
    if (limit) params = params.set('limit', limit.toString());
    console.log('Resultat getBoxHistorique:', `${this.apiUrl}/${boxId}/historique`, params);
    return this.http.get<any>(`${this.apiUrl}/${boxId}/historique`, { params });
  }
}