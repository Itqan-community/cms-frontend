import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NgIcon } from '@ng-icons/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { LicensesColors } from '../../../../../core/enums/licenses.enum';
import { TranslationDetails } from '../../models/translations.models';
import { TranslationsService } from '../../services/translations.service';
import { localizeLanguageCode } from '../../../utils/display-localization.util';

@Component({
  selector: 'app-translation-detail',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    NzModalModule,
    NzButtonModule,
    NgIcon,
    NzSkeletonModule,
    NzTableModule,
    NzTagModule,
    NzToolTipModule,
  ],
  templateUrl: './translation-detail.component.html',
  styleUrl: './translation-detail.component.less',
})
export class TranslationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translationsService = inject(TranslationsService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly translate = inject(TranslateService);

  readonly translation = signal<TranslationDetails | null>(null);
  readonly loading = signal(true);
  readonly licensesColors = LicensesColors;

  private slug!: string;

  ngOnInit(): void {
    this.slug = this.route.snapshot.params['slug'];
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.translationsService.getDetail(this.slug).subscribe({
      next: (data) => {
        this.translation.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onEdit(): void {
    void this.router.navigate(['/admin/translations', this.slug, 'edit']);
  }

  onDelete(): void {
    const name = this.translation()?.name_ar ?? 'هذه الترجمة';
    this.modal.confirm({
      nzTitle: 'هل أنت متأكد من الحذف؟',
      nzContent: `<b>${name}</b> — هذا الإجراء لا يمكن التراجع عنه.`,
      nzOkText: 'نعم، احذف',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'إلغاء',
      nzDirection: 'rtl',
      nzOnOk: () =>
        this.translationsService.delete(this.slug).subscribe({
          next: () => {
            this.message.success('تم حذف الترجمة بنجاح');
            void this.router.navigate(['/admin/translations']);
          },
          error: () => {},
        }),
    });
  }

  getLicenseColor(license: string): string {
    return this.licensesColors[license as keyof typeof LicensesColors] ?? '#8c8c8c';
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  languageLabel(code: string | null | undefined): string {
    return localizeLanguageCode(code, this.translate.currentLang);
  }
}
