// interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // CORRECTION: Appeler getToken() comme une méthode
    const token = this.authService.getToken();
    
    console.log('🔍 Intercepteur - Token:', token ? 'Présent' : 'Absent');
    
    if (token && !request.url.includes('/auth/')) {
      console.log('✅ Ajout du token à la requête:', request.url);
      const cloned = request.clone({
        headers: request.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(cloned);
    }
    
    return next.handle(request);
  }
}