import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from './components/navbar/navbar';
import { AuthService } from './services/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { Footer } from "./components/footer/footer";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarComponent,
    Footer
],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App implements OnInit {
  // Observable pour l'état de connexion
  isLoggedIn$ = new BehaviorSubject<boolean>(false);

  // Flag pour savoir si l'auth est initialisée
  authReady = false;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    console.log('🚀 AppComponent.ngOnInit() - Initialisation');

    // Initialiser l'authentification
    this.authService.initializeAuth().then((isLoggedIn) => {
      console.log('✅ Auth initialisée - isLoggedIn:', isLoggedIn);
      this.isLoggedIn$.next(isLoggedIn);
      this.authReady = true;
    });

    // S'abonner aux changements de token
    // À chaque fois que setToken() ou removeToken() est appelé,
    // mettre à jour isLoggedIn$
    const checkAuthState = () => {
      this.isLoggedIn$.next(this.authService.isLoggedIn());
    };

    // Observer les changements d'utilisateur
    this.authService.currentUser$.subscribe(() => {
      checkAuthState();
    });
  }
}
