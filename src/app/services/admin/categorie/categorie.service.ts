import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Categorie } from '../../boutique/profil/profil.service';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategorieService {
  private apiUrl = `${environment.apiUrl}/categorie`;

  constructor(private http: HttpClient) { }

  getCategoriesValides(): Observable<any> {
    return this.http.get(`${this.apiUrl}/valides`);
  }
}