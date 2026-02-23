import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Promotion {
  _id: string;
  produits: string[] | any[]; // string[] si non peuplé, any[] si peuplé avec populate
  reduction: number;
  date_debut?: Date;
  date_fin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePromotionData {
  produits: string[];
  reduction: number;
  date_debut?: Date | null;
  date_fin?: Date | null;
}

export interface UpdatePromotionData {
  reduction?: number;
  date_debut?: Date | null;
  date_fin?: Date | null;
}

export interface UpdatePromotionProductsData {
  produits: string[];
}


@Injectable({
  providedIn: 'root'
})
export class PromotionService {
  private apiUrl = `${environment.apiUrl}/promotion`;

  constructor(private http: HttpClient) { }

  /**
   * Créer une promotion sur des produits
   * POST /promotions
   */
  createPromotion(data: CreatePromotionData): Observable<Promotion> {
    return this.http.post<Promotion>(this.apiUrl, data);
  }

  /**
   * Liste des promotions de la boutique
   * GET /promotions
   */
  getPromotions(): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(this.apiUrl);
  }

  /**
   * Promotions actives
   * GET /promotions/actives
   */
  getPromotionsActives(): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(`${this.apiUrl}/actives`);
  }

  /**
   * Modifier une promotion
   * PUT /promotions/:id
   */
  updatePromotion(id: string, data: UpdatePromotionData): Observable<Promotion> {
    return this.http.put<Promotion>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Supprimer une promotion
   * DELETE /promotions/:id
   */
  deletePromotion(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /**
   * Récupérer une promotion par son ID
   * GET /promotions/:id
   */
  getPromotionById(id: string): Observable<Promotion> {
    return this.http.get<Promotion>(`${this.apiUrl}/${id}`);
  }
  /**
   * Ajouter des produits à une promotion
   * POST /promotions/:id/produits
   */
  addProduitsToPromotion(id: string, data: UpdatePromotionProductsData): Observable<Promotion> {
    return this.http.post<Promotion>(`${this.apiUrl}/${id}/produits`, data);
  }

  /**
   * Retirer des produits d'une promotion
   * DELETE /promotions/:id/produits
   */
  removeProduitsFromPromotion(id: string, data: UpdatePromotionProductsData): Observable<Promotion> {
    return this.http.request<Promotion>('delete', `${this.apiUrl}/${id}/produits`, {
      body: data
    });
  }

  /**
   * Remplacer tous les produits d'une promotion
   * PUT /promotions/:id/produits
   */
  updateAllProduitsInPromotion(id: string, data: UpdatePromotionProductsData): Observable<Promotion> {
    return this.http.put<Promotion>(`${this.apiUrl}/${id}/produits`, data);
  }
}