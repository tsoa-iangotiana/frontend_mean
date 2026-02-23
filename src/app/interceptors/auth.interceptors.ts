import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    let token = this.authService.getToken();

    // 🔥 fallback F5
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('token');
    }

    if (token && !request.url.includes('/auth/')) {
      request = request.clone({
        headers: request.headers.set('Authorization', `Bearer ${token}`)
      });
    }

    return next.handle(request).pipe(

      catchError((error: HttpErrorResponse) => {

        if (error.status === 401) {
          console.warn("🔐 401 détecté → déconnexion");

          this.authService.logout(); // supprime token
          this.router.navigate(['/login']);
        }

        return throwError(() => error);
      })

    );
  }
}
