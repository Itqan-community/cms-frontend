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
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { LicensesColors } from '../../../../../core/enums/licenses.enum';
import { AssetVersionsManagerComponent } from '../../../components/asset-versions-manager/asset-versions-manager.component';
import { localizeLanguageCode } from '../../../utils/display-localization.util';
import { TranslationDetails } from '../../models/translations.models';
import { TranslationsService } from '../../services/translations.service';

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
    NzTagModule,
    NzToolTipModule,
    TranslateModule,
    AssetVersionsManagerComponent,
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

  /** Route `:slug` segment (used when API omits `slug` on detail). */
  routeSlug!: string;

  ngOnInit(): void {
    this.routeSlug = this.route.snapshot.params['slug'];
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.translationsService.getDetail(this.routeSlug).subscribe({
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
    void this.router.navigate(['/admin/translations', this.routeSlug, 'edit']);
  }

  onDelete(): void {
    const name = this.translation()?.name_ar ?? this.translate.instant('ADMIN.TRANSLATIONS.TITLE');
    const dir = this.translate.currentLang === 'ar' ? 'rtl' : 'ltr';
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.TRANSLATIONS.DELETE.CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.TRANSLATIONS.DELETE.CONFIRM_BODY', { name }),
      nzOkText: this.translate.instant('ADMIN.TRANSLATIONS.DELETE.OK'),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.TRANSLATIONS.DELETE.CANCEL'),
      nzDirection: dir,
      nzOnOk: () =>
        this.translationsService.delete(this.routeSlug).subscribe({
          next: () => {
            this.message.success(
              this.translate.instant('ADMIN.TRANSLATIONS.MESSAGES.DELETE_SUCCESS')
            );
            void this.router.navigate(['/admin/translations']);
          },
        }),
    });
  }

  getLicenseColor(license: string): string {
    return this.licensesColors[license as keyof typeof LicensesColors] ?? '#8c8c8c';
  }

  languageLabel(code: string | null | undefined): string {
    return localizeLanguageCode(code, this.translate.currentLang);
  }
}
