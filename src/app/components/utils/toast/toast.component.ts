// components/shared/toast-container.component.ts
import { Component, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbToastModule } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from '../../../services/utils/toast/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, NgbToastModule],
  template: `
    <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1200">
      <ngb-toast
        *ngFor="let toast of toastService.toasts"
        [class]="toast.className"
        [autohide]="true"
        [delay]="toast.delay || 5000"
        (hidden)="toastService.remove(toast)">
        <ng-container *ngIf="toast.template">
          <ng-container [ngTemplateOutlet]="toast.template"></ng-container>
        </ng-container>
        <ng-container *ngIf="toast.text">
          {{ toast.text }}
        </ng-container>
      </ngb-toast>
    </div>
  `
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}