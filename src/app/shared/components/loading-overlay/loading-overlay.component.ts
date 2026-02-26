import { animate, style, transition, trigger } from '@angular/animations';
import { Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/services/loading.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  templateUrl: './loading-overlay.component.html',
  styleUrl: './loading-overlay.component.less',
  animations: [
    trigger('overlayAnim', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('250ms ease-in', style({ opacity: 0 }))]),
    ]),
  ],
})
export class LoadingOverlayComponent {
  protected readonly loadingService = inject(LoadingService);
}
