import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { User } from '../auth';

export interface UpdateProfilePayload {
  username?: string;
  email?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
@Injectable({
  providedIn: 'root',
})
export class UserService {
    private apiUrl = `${environment.apiUrl}/auth`;
    constructor(private http : HttpClient){}

    register(user: { username: string; email: string; password: string; role?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/inscription`, user);
  }
   private headers(): HttpHeaders {
    const token = localStorage.getItem('token') ?? '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  // Login
  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials);
  }
 getProfile(): Observable<User> {
  return this.http.get<{success: boolean, user: User}>(`${this.apiUrl}/profile`, {
    headers: this.headers(),
  }).pipe(
    map(response => response.user) // Extraire l'utilisateur de la réponse
  );
}

  /** PUT /auth/profile */
  updateProfile(userId: string, payload: UpdateProfilePayload): Observable<User> {
    return this.http
      .put<{ success: boolean; message: string; user: User }>(
        `${this.apiUrl}/user/${userId}`,
        payload,
        { headers: this.headers() }
      )
      .pipe(map((res) => res.user));
  }

  /**
   * PUT /auth/:id/change-password
   * La réponse est enveloppée : { success, message }
   */
  changePassword(
    userId: string,
    payload: ChangePasswordPayload
  ): Observable<{ message: string }> {
    return this.http
      .put<{ success: boolean; message: string }>(
        `${this.apiUrl}/${userId}/change-password`,
        payload,
        { headers: this.headers() }
      )
      .pipe(map((res) => ({ message: res.message })));
  }
}
