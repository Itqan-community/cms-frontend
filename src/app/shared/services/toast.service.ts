import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
  dismissible: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private nextId = 0;
  toasts = signal<Toast[]>([]);

  success(message: string, duration = 4000): void {
    this.addToast(message, 'success', duration);
  }

  error(message: string, duration = 6000): void {
    this.addToast(message, 'error', duration);
  }

  warning(message: string, duration = 5000): void {
    this.addToast(message, 'warning', duration);
  }

  info(message: string, duration = 4000): void {
    this.addToast(message, 'info', duration);
  }

  dismiss(id: number): void {
    this.toasts.update((toasts) => toasts.filter((t) => t.id !== id));
  }

  private addToast(message: string, type: ToastType, duration: number): void {
    const toast: Toast = {
      id: this.nextId++,
      message,
      type,
      duration,
      dismissible: true,
    };

    this.toasts.update((toasts) => [...toasts, toast]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(toast.id), duration);
    }
  }
}
