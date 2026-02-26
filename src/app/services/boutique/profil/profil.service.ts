import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Boutique {
  _id?: string ;
  profil_photo?: string | null;
  slogan?: string | null;
  condition_vente?: string | null;
  contact: string[];
  nom: string;
  description?: string;
  box?: any;
  responsable?: string;
  active?: boolean;
  categories: Categorie[];
  note_moyenne?: number;  // Note moyenne calculée par le backend
  createdAt?: Date;
  updatedAt?: Date;
  userNote?: number;      // Note donnée par l'utilisateur connecté
  estFavoris?: boolean;
}

export interface Categorie {
  _id: string;
  nom: string;
  valide: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Box {
  _id: string;
  numero: string;
  surface: number;
  prix_loyer: number;
  libre: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProfilService {
  private apiUrl = `${environment.apiUrl}/boutique`;
  private base = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }

  toggleBoutiqueActive(boutiqueId: string): Observable<any> {
  return this.http.patch(`${this.apiUrl}/${boutiqueId}/toggle`, {});
}
  // Vérifier si le responsable a une boutique
  checkResponsableBoutique(responsableId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/check-responsable/${responsableId}`);
  }

  // Récupérer la boutique du responsable
  getBoutiqueByResponsable(responsableId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/responsable/${responsableId}`);
  }

  // Créer une nouvelle boutique
  createBoutique(data: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/insert`, data);
  }


  // Mettre à jour la boutique
  updateBoutique(id: string, boutiqueData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, boutiqueData);
  }

  // Ajouter un contact
  addContact(boutiqueId: string, contact: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${boutiqueId}/contacts`, { contact });
  }

  // Supprimer un contact
  removeContact(boutiqueId: string, index: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${boutiqueId}/contacts/${index}`);
  }

  // Ajouter une catégorie
  addCategorie(boutiqueId: string, categorieId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${boutiqueId}/categories`, { categorieId });
  }

  // Supprimer une catégorie
  removeCategorie(boutiqueId: string, categorieId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${boutiqueId}/categories/${categorieId}`);
  }

  uploadPhoto(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('photo', file);
    return this.http.post(`${this.base}/upload/photo`, formData);
  }

  //recuperer tous les boutiques
  getAllBoutiques(filters?: { active?: boolean; search?: string; page?: number; limit?: number }): Observable<any> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.active !== undefined) {
        params = params.set('active', filters.active.toString());
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
    }

    // 👉 Important: passer les params dans la requête
    return this.http.get(`${this.apiUrl}/all`, { params });
  }

  // Ou version simplifiée si vous voulez juste les boutiques actives
  getBoutiquesActives(limit: number = 100): Observable<any> {
    return this.getAllBoutiques({ active: true, limit });
  }
}
