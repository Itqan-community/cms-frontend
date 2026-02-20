import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Toast, ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-container.component.html',
  styleUrls: ['./toast-container.component.less'],
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      success: 'bx bx-check-circle',
      error: 'bx bx-x-circle',
      warning: 'bx bx-error',
      info: 'bx bx-info-circle',
    };
    return icons[type] || icons['info'];
  }

  dismiss(toast: Toast): void {
    this.toastService.dismiss(toast.id);
  }
}
