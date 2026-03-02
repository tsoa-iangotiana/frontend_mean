import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../../services/user/user.service'; // Corriger le chemin
import { AuthService } from '../../../services/auth';

@Component({
  selector: 'app-login',
  standalone: true, // ⚠️ Ajouter 'standalone: true'
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'], // ⚠️ styleUrl -> styleUrls
})
export class Login {
  email = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  // Mapping des rôles vers les chemins
  private readonly roleRoutes: { [key: string]: string } = {
    'acheteur': '/boutique/all',
    'boutique': '/boutique/dashboard',
    'admin': '/admin/dashboard'
  };

constructor(
  private userService: UserService,
  public authService: AuthService,   // ← public pour l'utiliser dans le template
  private router: Router,
  private cdr : ChangeDetectorRef
) {}

  // ngOnInit(): void {
  //   // ⚠️ Vérifier si déjà connecté : rediriger vers articles
  //   if (this.authService.isLoggedIn()) {
  //     console.log('🔒 Déjà connecté - Redirection vers /articles');
  //     this.router.navigate(['/articles']);
  //   }
  // }
  ngOnInit(): void {
    // Vérifier si déjà connecté via l'observable
    this.authService.currentUser$.subscribe((user) => {
      if (this.authService.isLoggedIn() && user) {
        console.log(`🔒 Déjà connecté en tant que ${user.role} - Redirection`);
        this.redirectBasedOnRole(user.role);
      }
    });
  }

  // login.ts - Modifiez la méthode login()
login() {
  console.log (this.password);
  this.userService.login({
    email: this.email,
    password: this.password
  }).subscribe({
    next: (response) => {
      console.log('✅ Connexion réussie:', response);

      if (response.token) {
        // Stocker le token
        this.authService.setToken(response.token);
        this.authService.setCurrentUser(response.user);
        console.log('Token stocké:', response.token.substring(0, 20) + '...');

        // VÉRIFIEZ LE TOKEN AVANT REDIRECTION
        try {
          // Décoder le token pour vérifier qu'il est valide
          const payload = JSON.parse(atob(response.token.split('.')[1]));
          console.log('Token payload:', payload);
          console.log('Expire le:', new Date(payload.exp * 1000));

          // Petit délai avant redirection
          // Variante A – micro délai
          setTimeout(() => {
            // this.router.navigate(['/articles'], { replaceUrl: true });
            // Rediriger en fonction du rôle
            this.redirectBasedOnRole(response.user.role);
            this.cdr.markForCheck();
          }, 0);

        } catch (error) {
          console.error('Token invalide:', error);
          alert('Token invalide reçu du serveur');
        }
      }
    },
    error: (error) => {
      console.error('❌ Erreur connexion:', error);
      alert('Erreur: ' + (error.error?.message || 'Identifiants incorrects'));
    }
  });
}

private redirectBasedOnRole(role: string): void {
    const route = this.roleRoutes[role];

    if (route) {
      console.log(`🔄 Redirection vers ${route} (rôle: ${role})`);

      // Petit délai avant redirection
      setTimeout(() => {
        this.router.navigate([route], { replaceUrl: true });
      }, 100);
    } else {
      console.error(`❌ Rôle inconnu: ${role}`);
      this.errorMessage = `Rôle utilisateur non reconnu: ${role}`;
      this.isLoading = false;
    }
  }

goToRegister(): void {
  this.router.navigate(['/inscription']);
}

}
