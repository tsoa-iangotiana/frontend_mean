import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [], // Plus besoin de RouterLink
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  constructor(private router: Router) {}

  goTo(role: string) {
    console.log('Navigation vers inscription pour:', role);
    this.router.navigate(['/inscription', role]);
  }
}