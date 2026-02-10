// Renommez le fichier en article.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ArticleService {  
  private apiUrl = `${environment.apiUrl}/articles`;
  
  constructor(private http: HttpClient) { 
    console.log('📦 ArticleService initialisé');
  }
  
  getArticles(): Observable<any> {
    console.log('🔗 GET Articles vers:', this.apiUrl);
    return this.http.get(this.apiUrl);
  }
  
  addArticle(articleData: any): Observable<any> {
    console.log('📤 POST Article:', articleData);
    return this.http.post(this.apiUrl, articleData);
  }
  
  updateArticle(articleId: string, articleData: any): Observable<any> {
    console.log('✏️ PUT Article:', articleId);
    return this.http.put(`${this.apiUrl}/${articleId}`, articleData);
  }
  
  deleteArticle(articleId: string): Observable<any> {
    console.log('🗑️ DELETE Article:', articleId);
    return this.http.delete(`${this.apiUrl}/${articleId}`);
  }
}