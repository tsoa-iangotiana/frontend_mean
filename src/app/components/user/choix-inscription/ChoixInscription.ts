import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-choix-inscription',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './ChoixInscription.html',
  styleUrl: './choix-inscription.css',
})
export class ChoixInscription {
  selectedRole: 'admin' | 'boutique' | 'acheteur' | null = null;

  constructor(private router: Router) {}

  select(role: 'admin' | 'boutique' | 'acheteur'): void {
    this.selectedRole = role;
  }

  continuer(): void {
    if (!this.selectedRole) return;
    this.router.navigate(['/inscription', this.selectedRole]);
  }
}
