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
import { LicensesColors } from '../../../../../core/enums/licenses.enum';
import { MaddLevel, MeemBehavior, RecitationDetails } from '../../models/recitations.models';
import { RecitationsService } from '../../services/recitations.service';

@Component({
  selector: 'app-recitation-detail',
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
  templateUrl: './recitation-detail.component.html',
  styleUrl: './recitation-detail.component.less',
})
export class RecitationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recitationsService = inject(RecitationsService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly translate = inject(TranslateService);

  readonly recitation = signal<RecitationDetails | null>(null);
  readonly loading = signal(true);
  readonly licensesColors = LicensesColors;
  readonly maddLevel = MaddLevel;
  readonly meemBehavior = MeemBehavior;

  private slug!: string;

  ngOnInit(): void {
    this.slug = this.route.snapshot.params['slug'];
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.recitationsService.getDetail(this.slug).subscribe({
      next: (data) => {
        this.recitation.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onEdit(): void {
    void this.router.navigate(['/admin/recitations', this.slug, 'edit']);
  }

  onDelete(): void {
    const name =
      this.recitation()?.name_ar ?? this.translate.instant('ADMIN.RECITATIONS.DELETE.DEFAULT_NAME');
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.RECITATIONS.DELETE.CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.RECITATIONS.DELETE.CONFIRM_BODY', { name }),
      nzOkText: this.translate.instant('ADMIN.RECITATIONS.DELETE.OK'),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.RECITATIONS.DELETE.CANCEL'),
      nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
      nzOnOk: () =>
        this.recitationsService.delete(this.slug).subscribe({
          next: () => {
            this.message.success(
              this.translate.instant('ADMIN.RECITATIONS.MESSAGES.DELETE_SUCCESS')
            );
            void this.router.navigate(['/admin/recitations']);
          },
        }),
    });
  }

  getLicenseColor(license: string): string {
    return this.licensesColors[license as keyof typeof LicensesColors] ?? '#8c8c8c';
  }

  maddLabel(level: MaddLevel): string {
    return level === MaddLevel.TWASSUT
      ? this.translate.instant('ADMIN.RECITATIONS.FILTERS.MADD_TWASSUT')
      : this.translate.instant('ADMIN.RECITATIONS.FILTERS.MADD_QASR');
  }

  meemLabel(b: MeemBehavior): string {
    return b === MeemBehavior.SILAH
      ? this.translate.instant('ADMIN.RECITATIONS.FORM.MEEM_WASL_LONG')
      : this.translate.instant('ADMIN.RECITATIONS.FILTERS.MEEM_SKOUN');
  }
}
