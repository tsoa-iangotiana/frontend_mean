import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface NoteResponse {
  message: string;
  note: number;
  statistiques?: {
    moyenne: number;
    total: number;
    repartition: Array<{
      note: number;
      count: number;
      pourcentage: number;
    }>;
  };
}

export interface MaNoteResponse {
  a_note: boolean;
  note: number | null;
  avis_id: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class Note {
  private apiUrl = `${environment.apiUrl}/acheteur/note`;

  constructor(private http: HttpClient) {}

  // Noter un produit
  noterProduit(produitId: string, note: number): Observable<NoteResponse> {
    return this.http.post<NoteResponse>(`${this.apiUrl}/produit`, {
      produitId,
      note
    });
  }

  // Noter une boutique
  noterBoutique(boutiqueId: string, note: number): Observable<NoteResponse> {
    return this.http.post<NoteResponse>(`${this.apiUrl}/boutique`, {
      boutiqueId,
      note
    });
  }

  // Obtenir ma note pour une cible
  getMaNote(cible_type: 'PRODUIT' | 'BOUTIQUE', cible_id: string): Observable<MaNoteResponse> {
    return this.http.get<MaNoteResponse>(`${this.apiUrl}/ma-note`, {
      params: { cible_type, cible_id }
    });
  }

  // Supprimer ma note
  supprimerNote(avisId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${avisId}`);
  }
}
