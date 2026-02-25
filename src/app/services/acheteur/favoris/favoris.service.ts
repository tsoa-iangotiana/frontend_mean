import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface FavorisResponse {
  success: boolean;
  favoris?: {
    produits: any[];
    boutiques: any[];
  };
}

export interface ToggleFavorisResponse {
  success: boolean;
  message: string;
  estFavoris: boolean;
  boutique?: {
    _id: string;
    nom: string;
  };
  produit?: {
    _id: string;
    nom: string;
  };
}

export interface CheckFavorisResponse {
  success: boolean;
  estFavoris: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class Favoris {
  private apiUrl = `${environment.apiUrl}/acheteur/favoris`;

  constructor(private http: HttpClient) {}

  // Récupérer tous les favoris
  getFavoris(): Observable<FavorisResponse> {
    return this.http.get<FavorisResponse>(this.apiUrl);
  }

  // Toggle boutique
  toggleBoutiqueFavoris(boutiqueId: string): Observable<ToggleFavorisResponse> {
    return this.http.post<ToggleFavorisResponse>(`${this.apiUrl}/boutique/${boutiqueId}`, {});
  }

  // Toggle produit
  toggleProduitFavoris(produitId: string): Observable<ToggleFavorisResponse> {
    return this.http.post<ToggleFavorisResponse>(`${this.apiUrl}/produit/${produitId}`, {});
  }

  // Vérifier si une boutique est en favoris
  checkBoutiqueFavoris(boutiqueId: string): Observable<CheckFavorisResponse> {
    return this.http.get<CheckFavorisResponse>(`${this.apiUrl}/check/boutique/${boutiqueId}`);
  }

  // Vérifier si un produit est en favoris
  checkProduitFavoris(produitId: string): Observable<CheckFavorisResponse> {
    return this.http.get<CheckFavorisResponse>(`${this.apiUrl}/check/produit/${produitId}`);
  }

  // Effacer tous les favoris
  clearFavoris(): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(this.apiUrl);
  }
}
