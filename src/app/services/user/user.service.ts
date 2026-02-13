import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
    private apiUrl = `${environment.apiUrl}/auth`;
    constructor(private http : HttpClient){}

    register(user: { username: string; email: string; password: string; role?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/inscription`, user);
  }

  // Login
  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials);
  }
}