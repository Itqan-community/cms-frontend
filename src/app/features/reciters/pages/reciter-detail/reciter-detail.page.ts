import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonComponent } from 'ng-zorro-antd/button';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ToastService } from '../../../../shared/services/toast.service';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { Reciter } from '../../models/reciter.model';
import { RecitersService } from '../../services/reciters.service';

@Component({
  selector: 'app-reciter-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, TranslateModule, NzButtonComponent, NzTagModule],
  templateUrl: './reciter-detail.page.html',
  styleUrls: ['./reciter-detail.page.less'],
})
export class ReciterDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recitersService = inject(RecitersService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);

  reciter = signal<Reciter | null>(null);
  loading = signal(true);
  notFound = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(id)) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }
    this.loadReciter(id);
  }

  private loadReciter(id: number): void {
    this.recitersService.getReciter(id).subscribe({
      next: (reciter) => {
        this.reciter.set(reciter);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        const status = (error as { status?: number })?.status;
        if (status === 404) {
          this.notFound.set(true);
        } else {
          this.toast.error(
            getErrorMessage(error) ||
              this.translate.instant('RECITERS.DETAIL.ERRORS.LOAD_FAILED')
          );
        }
      },
    });
  }

  navigateToEdit(): void {
    const reciter = this.reciter();
    if (reciter) {
      this.router.navigate(['/reciters', reciter.id, 'edit']);
    }
  }

  navigateToList(): void {
    this.router.navigate(['/reciters']);
  }
}
