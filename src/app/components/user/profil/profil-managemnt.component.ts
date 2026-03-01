import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService, User } from '../../../services/auth';
import { UserService } from '../../../services/user/user.service';
import { Router } from '@angular/router';

function passwordMatch(group: AbstractControl): ValidationErrors | null {
  const n = group.get('newPassword')?.value;
  const c = group.get('confirmPassword')?.value;
  return n === c ? null : { mismatch: true };
}

@Component({
  selector: 'app-profil-managemnt',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profil-managemnt.component.html',
  styleUrl: './profil-managemnt.component.css',
})
export class ProfilManagemntComponent implements OnInit {
  user: User | null = null;
  tab: 'view' | 'edit' | 'pwd' = 'view';

  profileForm!: FormGroup;
  pwdForm!: FormGroup;

  profileLoading = false;
  pwdLoading = false;
  profileMsg: { type: 'success' | 'error'; text: string } | null = null;
  pwdMsg: { type: 'success' | 'error'; text: string } | null = null;

  showCurrent = false;
  showNew = false;
  showConfirm = false;

  constructor(private fb: FormBuilder, private svc: UserService,
    private cdr:ChangeDetectorRef,private authService : AuthService,
  private router : Router) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
    });

    this.pwdForm = this.fb.group(
      {
        currentPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordMatch }
    );

    this.loadProfile();
  }

  loadProfile(): void {
    this.svc.getProfile().subscribe({
      next: (u) => {
        this.user = u;
        this.profileForm.patchValue({ username: u.username, email: u.email });
        console.log("donnée user reçu", this.user);
        this.cdr.markForCheck();
      },
      error: () =>
        (this.profileMsg = {
          type: 'error',
          text: 'Impossible de charger le profil.',
        }),
    });
  }

  goTab(t: 'view' | 'edit' | 'pwd'): void {
    this.tab = t;
    this.profileMsg = null;
    this.pwdMsg = null;
  }

  saveProfile(): void {
  if (this.profileForm.invalid) {
    this.profileForm.markAllAsTouched();
    this.cdr.markForCheck();
    return;
  }
  
  this.profileLoading = true;
  this.profileMsg = null;
  
  // Créer le payload avec seulement les champs modifiés
  const formValues = this.profileForm.value;
  const payload: any = {};
  
  if (formValues.username !== this.user?.username) payload.username = formValues.username;
  if (formValues.email !== this.user?.email) payload.email = formValues.email;
  
  // Si rien n'a changé
  if (Object.keys(payload).length === 0) {
    this.profileLoading = false;
    this.profileMsg = { type: 'success', text: 'Aucune modification' };
    setTimeout(() => { this.tab = 'view'; this.profileMsg = null; }, 1500);
    this.cdr.markForCheck();
    return;
  }
  
  this.svc.updateProfile(this.user!._id, payload).subscribe({
    next: (u) => {
      this.user = u;
      this.profileLoading = false;
      this.profileMsg = { type: 'success', text: 'Profil mis à jour ✓ ... Veuillez vous reconnecter' };
      this.tab = 'view';
      this.cdr.markForCheck();
      setTimeout(() => this.logout(), 2000);
    },
    error: (e) => {
      this.profileLoading = false;
      this.profileMsg = {
        type: 'error',
        text: e.error?.message ?? 'Erreur lors de la mise à jour.',
      };
      this.cdr.markForCheck();
    }
  });
}

  changePwd(): void {
    if (this.pwdForm.invalid) {
      this.pwdForm.markAllAsTouched();
      
      return;
    }
    this.pwdLoading = true;
    this.pwdMsg = null;
    const { currentPassword, newPassword } = this.pwdForm.value;
    this.svc.changePassword(this.user!._id, { currentPassword, newPassword }).subscribe({
      next: (r) => {
        this.pwdLoading = false;
        this.pwdMsg = { type: 'success', text: r.message + ' — Déconnexion en cours...' };
        this.pwdForm.reset();
        this.cdr.markForCheck();
        setTimeout(() => this.logout(), 2000);
      },
      error: (e) => {
        this.pwdLoading = false;
        this.pwdMsg = {
          type: 'error',
          text: e.error?.message ?? 'Erreur lors du changement.',
        };
      },
    });
  }

  roleLabel(r: string): string {
    return (
      ({ admin: 'Administrateur', boutique: 'Boutique', acheteur: 'Acheteur' } as Record<string, string>)[r] ?? r
    );
  }

  ctrl(form: FormGroup, name: string) {
    return form.get(name);
  }
  
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login'])
  }
}