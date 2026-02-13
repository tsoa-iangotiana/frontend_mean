import { Component, OnInit } from '@angular/core';
import { UserService } from '../../../services/user/user.service';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-inscription',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inscription.html',
  styleUrl: './inscription.css',
})
export class Inscription implements OnInit {

  newUser = {
    username: '',
    email: '',
    password: '',
    role: ''
  };

  constructor(
    private userService: UserService,
    private routeur: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const roleFromUrl = this.route.snapshot.paramMap.get('role');
    this.newUser.role = roleFromUrl ? roleFromUrl.toLowerCase() : '';
  }

  register() {
    this.userService.register(this.newUser).subscribe({
      next: () => {
        this.routeur.navigate(['/login']);
      },
      error: (error) => {
        console.error('Erreur inscription', error);
      }
    });
  }
}
