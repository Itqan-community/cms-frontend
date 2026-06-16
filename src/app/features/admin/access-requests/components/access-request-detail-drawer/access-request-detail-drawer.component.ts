import { DatePipe } from '@angular/common';
import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import {
  AccessRequestDetailOut,
  AccessRequestStatus,
  IntendedUse,
} from '../../models/access-requests.models';
import { AccessRequestsService } from '../../services/access-requests.service';

@Component({
  selector: 'app-access-request-detail-drawer',
  standalone: true,
  imports: [DatePipe, NzDrawerModule, NzSpinModule, NzTagModule, TranslateModule],
  templateUrl: './access-request-detail-drawer.component.html',
  styleUrl: './access-request-detail-drawer.component.less',
})
export class AccessRequestDetailDrawerComponent {
  private readonly accessRequestsService = inject(AccessRequestsService);
  private readonly translate = inject(TranslateService);

  readonly visible = input(false);
  readonly requestId = input<number | null>(null);
  readonly closed = output<void>();

  readonly loading = signal(false);
  readonly loadFailed = signal(false);
  readonly detail = signal<AccessRequestDetailOut | null>(null);

  constructor() {
    effect(() => {
      const id = this.requestId();
      const isVisible = this.visible();
      untracked(() => {
        if (isVisible && id != null) {
          this.loadDetail(id);
        } else if (!isVisible) {
          this.detail.set(null);
          this.loadFailed.set(false);
        }
      });
    });
  }

  onClose(): void {
    this.closed.emit();
  }

  statusTagColor(status: AccessRequestStatus): string {
    switch (status) {
      case 'pending':
        return 'gold';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  }

  statusLabel(status: AccessRequestStatus): string {
    return this.translate.instant(`ADMIN.ACCESS_REQUESTS.STATUS.${status.toUpperCase()}`);
  }

  intendedUseLabel(use: IntendedUse): string {
    const key = use === 'non-commercial' ? 'NON_COMMERCIAL' : 'COMMERCIAL';
    return this.translate.instant(`ADMIN.ACCESS_REQUESTS.INTENDED_USE.${key}`);
  }

  formatActor(value: string | null): string {
    if (!value) {
      return '—';
    }
    if (value === 'System') {
      return this.translate.instant('ADMIN.ACCESS_REQUESTS.DRAWER.AUTO_ACCEPTED');
    }
    return value;
  }

  private loadDetail(id: number): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    this.detail.set(null);

    this.accessRequestsService.get(id).subscribe({
      next: (res) => {
        this.detail.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadFailed.set(true);
      },
    });
  }
}
