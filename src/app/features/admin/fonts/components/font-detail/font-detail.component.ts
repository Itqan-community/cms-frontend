import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { AdminAuthService } from '../../../services/admin-auth.service';
import {
  createDisplayLocalizationLabels,
  localizeLanguageCode,
} from '../../../utils/display-localization.util';
import { FontDetails } from '../../models/fonts.models';
import { FontsService } from '../../services/fonts.service';
import { canDeleteFont, canUpdateFont } from '../../utils/font-permissions.util';

@Component({
  selector: 'app-font-detail',
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
  templateUrl: './font-detail.component.html',
  styleUrl: './font-detail.component.less',
})
export class FontDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fontsService = inject(FontsService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly translate = inject(TranslateService);
  private readonly adminAuth = inject(AdminAuthService);

  readonly canUpdateFont = computed(() => canUpdateFont(this.adminAuth));
  readonly canDeleteFont = computed(() => canDeleteFont(this.adminAuth));

  readonly font = signal<FontDetails | null>(null);
  readonly loading = signal(true);
  readonly licensesColors = LicensesColors;

  private slug!: string;

  ngOnInit(): void {
    this.slug = this.route.snapshot.params['slug'];
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.fontsService.getDetail(this.slug).subscribe({
      next: (data) => {
        this.font.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onEdit(): void {
    void this.router.navigate(['/admin/fonts', this.slug, 'edit']);
  }

  onDelete(): void {
    const name = this.font()?.name_ar ?? this.translate.instant('ADMIN.FONTS.TITLE');
    const dir = this.translate.currentLang === 'ar' ? 'rtl' : 'ltr';
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.FONTS.DELETE.CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.FONTS.DELETE.CONFIRM_BODY', { name }),
      nzOkText: this.translate.instant('ADMIN.FONTS.DELETE.OK'),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.FONTS.DELETE.CANCEL'),
      nzDirection: dir,
      nzOnOk: () =>
        this.fontsService.delete(this.slug).subscribe({
          next: () => {
            this.message.success(this.translate.instant('ADMIN.FONTS.MESSAGES.DELETE_SUCCESS'));
            void this.router.navigate(['/admin/fonts']);
          },
        }),
    });
  }

  getLicenseColor(license: string): string {
    return this.licensesColors[license as keyof typeof LicensesColors] ?? '#8c8c8c';
  }

  languageLabel(code: string | null | undefined): string {
    return localizeLanguageCode(
      code,
      this.translate.currentLang,
      createDisplayLocalizationLabels(this.translate)
    );
  }
}
