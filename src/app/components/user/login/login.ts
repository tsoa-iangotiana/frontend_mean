import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../../services/user/user.service';
import { AuthService } from '../../../services/auth';

interface DefaultAccess {
  role: string;
  roleClass: string;
  email: string;
  password: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login implements OnInit {
  email    = '';
  password = '';
  errorMessage = '';
  isLoading    = false;
  showPassword = false;

  /** 3 accès de démonstration — adapter les valeurs selon votre environnement */
  defaultAccess: DefaultAccess[] = [
    {
      role:      'Admin',
      roleClass: 'role-admin',
      email:     'admina@gmail.com',
      password:  'admina',
    },
    {
      role:      'Boutique',
      roleClass: 'role-boutique',
      email:     'henintsoa@gmail.com',
      password:  '123456',
    },
    {
      role:      'Acheteur',
      roleClass: 'role-acheteur',
      email:     'acheteur@test.com',
      password:  'acheteur',
    },
  ];

  private readonly roleRoutes: { [key: string]: string } = {
    acheteur: '/boutique/all',
    boutique: '/boutique/dashboard',
    admin:    '/admin/dashboard',
  };

  constructor(
    private userService: UserService,
    public  authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      if (this.authService.isLoggedIn() && user) {
        this.redirectBasedOnRole(user.role);
      }
    });
  }

  /** Remplit les champs avec les identifiants de l'accès sélectionné */
  fillCredentials(acc: DefaultAccess): void {
    this.email    = acc.email;
    this.password = acc.password;
    this.errorMessage = '';
  }

  login(): void {
    this.errorMessage = '';

    if (!this.email || !this.password) return;

    this.isLoading = true;
    this.cdr.markForCheck();

    this.userService.login({ email: this.email, password: this.password })
      .subscribe({
        next: (response) => {
          if (!response.token) {
            this.handleError('Réponse invalide du serveur. Veuillez réessayer.');
            return;
          }

          try {
            const payload = JSON.parse(atob(response.token.split('.')[1]));
            console.log('✅ Connexion réussie — rôle :', payload.role);

            this.authService.setToken(response.token);
            this.authService.setCurrentUser(response.user);

            setTimeout(() => {
              this.redirectBasedOnRole(response.user.role);
              this.cdr.markForCheck();
            }, 0);

          } catch (err) {
            this.handleError('Token reçu invalide. Contactez l\'administrateur.');
          }
        },
        error: (err) => {
          const status = err?.status;

          if (status === 401) {
            this.handleError('Email ou mot de passe incorrect.');
          } else if (status === 403) {
            this.handleError('Votre compte est désactivé. Contactez l\'administrateur.');
          } else if (status === 0 || status === 503) {
            this.handleError('Impossible de joindre le serveur. Vérifiez votre connexion.');
          } else {
            this.handleError(
              err?.error?.message || 'Une erreur est survenue. Veuillez réessayer.'
            );
          }
        },
      });
  }

  private handleError(message: string): void {
    this.errorMessage = message;
    this.isLoading    = false;
    this.cdr.markForCheck();
  }

  private redirectBasedOnRole(role: string): void {
    const route = this.roleRoutes[role];
    if (route) {
      setTimeout(() => this.router.navigate([route], { replaceUrl: true }), 100);
    } else {
      this.handleError(`Rôle utilisateur non reconnu : ${role}`);
    }
  }

  goToRegister(): void {
    this.router.navigate(['/inscription']);
  }
}
