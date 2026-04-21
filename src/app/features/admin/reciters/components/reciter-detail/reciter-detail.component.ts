import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { localizeCountryCodeOrName } from '../../../utils/display-localization.util';
import { ReciterDetails } from '../../models/reciters.models';
import { RecitersAdminService } from '../../services/reciters.service';

@Component({
  selector: 'app-reciter-detail',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    NzModalModule,
    NzButtonModule,
    NgIcon,
    NzSkeletonModule,
    NzTagModule,
    TranslateModule,
  ],
  templateUrl: './reciter-detail.component.html',
  styleUrl: './reciter-detail.component.less',
})
export class ReciterDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recitersService = inject(RecitersAdminService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly translate = inject(TranslateService);

  readonly reciter = signal<ReciterDetails | null>(null);
  readonly loading = signal(true);

  private slug!: string;

  ngOnInit(): void {
    this.slug = this.route.snapshot.params['slug'];
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.recitersService.getDetail(this.slug).subscribe({
      next: (data) => {
        this.reciter.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onEdit(): void {
    void this.router.navigate(['/admin/reciters', this.slug, 'edit']);
  }

  onDelete(): void {
    const name =
      this.reciter()?.name_ar ?? this.translate.instant('ADMIN.RECITERS.DELETE.DEFAULT_NAME');
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.RECITERS.DELETE.CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.RECITERS.DELETE.CONFIRM_BODY', { name }),
      nzOkText: this.translate.instant('ADMIN.RECITERS.DELETE.OK'),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.RECITERS.DELETE.CANCEL'),
      nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
      nzOnOk: () =>
        this.recitersService.delete(this.slug).subscribe({
          next: () => {
            this.message.success(this.translate.instant('ADMIN.RECITERS.MESSAGES.DELETE_SUCCESS'));
            void this.router.navigate(['/admin/reciters']);
          },
        }),
    });
  }

  countryLabel(country: string | null | undefined): string {
    return localizeCountryCodeOrName(country, this.translate.currentLang);
  }
}
