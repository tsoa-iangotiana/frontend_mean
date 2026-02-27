import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Categorie } from '../../boutique/profil/profil.service';
import { environment } from '../../../../environments/environment';
import { map } from 'rxjs/operators';


export interface CategoriePayload {
  nom:     string;
  valide?: boolean;
}

interface ApiListResponse {
  success:    boolean;
  count:      number;
  categories: Categorie[];
}

interface ApiSingleResponse {
  success:   boolean;
  message?:  string;
  categorie: Categorie;
}

interface ApiDeleteResponse {
  success: boolean;
  message: string;
}

export interface ApiMultipleResponse {
  success:     boolean;
  message:     string;
  categories?: Categorie[];
  errors?:     string[];
}
@Injectable({
  providedIn: 'root'
})
export class CategorieService {
  private apiUrl = `${environment.apiUrl}/categorie`;

  constructor(private http: HttpClient) { }

  getCategoriesValides(): Observable<any> {
    return this.http.get(`${this.apiUrl}/valides`);
  }

  getAll(): Observable<Categorie[]> {
    return this.http
      .get<ApiListResponse>(this.apiUrl)
      .pipe(map(r => r.categories));
  }
  getById(id: string): Observable<Categorie> {
    return this.http
      .get<ApiSingleResponse>(`${this.apiUrl}/${id}`)
      .pipe(map(r => r.categorie));
  }

  create(payload: CategoriePayload): Observable<Categorie> {
    return this.http
      .post<ApiSingleResponse>(`${this.apiUrl}/insert-categorie`, payload)
      .pipe(map(r => r.categorie));
  }

  createMultiple(categories: CategoriePayload[]): Observable<ApiMultipleResponse> {
    return this.http.post<ApiMultipleResponse>(`${this.apiUrl}/insert-multiple`, categories);
  }

  update(id: string, payload: CategoriePayload): Observable<Categorie> {
    return this.http
      .put<ApiSingleResponse>(`${this.apiUrl}/${id}`, payload)
      .pipe(map(r => r.categorie));
  }

  toggle(id: string): Observable<Categorie> {
    return this.http
      .patch<ApiSingleResponse>(`${this.apiUrl}/${id}/toggle`, {})
      .pipe(map(r => r.categorie));
  }

  delete(id: string): Observable<ApiDeleteResponse> {
    return this.http.delete<ApiDeleteResponse>(`${this.apiUrl}/${id}`);
  }
}