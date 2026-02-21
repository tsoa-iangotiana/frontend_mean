// services/toast/toast.service.ts
import { Injectable, TemplateRef } from '@angular/core';

export interface Toast {
  template?: TemplateRef<any>;
  text?: string;
  className?: string;
  delay?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  toasts: Toast[] = [];

  show(textOrTpl: string | TemplateRef<any>, options: any = {}) {
    // Déterminer la classe CSS en fonction du type
    let className = 'bg-success text-light';
    
    if (options === 'error') {
      className = 'bg-danger text-light';
    } else if (options === 'warning') {
      className = 'bg-warning text-dark';
    } else if (options === 'info') {
      className = 'bg-info text-light';
    } else if (typeof options === 'string') {
      // Si options est un string, c'est probablement le type
      switch(options) {
        case 'error': className = 'bg-danger text-light'; break;
        case 'warning': className = 'bg-warning text-dark'; break;
        case 'info': className = 'bg-info text-light'; break;
        default: className = 'bg-success text-light';
      }
    } else if (options.className) {
      className = options.className;
    }

    const toast: Toast = {
      text: typeof textOrTpl === 'string' ? textOrTpl : undefined,
      template: typeof textOrTpl === 'object' ? textOrTpl : undefined,
      className,
      delay: options.delay || 5000
    };

    this.toasts.push(toast);
    
    // Auto-supprimer après le délai
    setTimeout(() => {
      this.remove(toast);
    }, toast.delay);
  }

  remove(toast: Toast) {
    this.toasts = this.toasts.filter(t => t !== toast);
  }

  clear() {
    this.toasts.splice(0, this.toasts.length);
  }
}