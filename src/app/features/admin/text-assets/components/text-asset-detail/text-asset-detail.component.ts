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
import { AssetTemplateBadgeComponent } from '../../../../../shared/components/asset-template-badge/asset-template-badge.component';
import { PORTAL_PERMISSIONS } from '../../../constants/portal-permission.constants';
import { AdminAuthService } from '../../../services/admin-auth.service';
import {
  createDisplayLocalizationLabels,
  localizeLanguageCode,
} from '../../../utils/display-localization.util';
import { AssetVersionsManagerComponent } from '../../../components/asset-versions-manager/asset-versions-manager.component';
import { TextAssetDetails } from '../../models/text-assets.models';
import { TextAssetsService } from '../../services/text-assets.service';
import { AssetUsageSectionComponent } from '../../../../usage/components/asset-usage-section/asset-usage-section.component';
import { AssetChannelTagsComponent } from '../../../components/asset-channels/asset-channels.component';

@Component({
  selector: 'app-text-asset-detail',
  standalone: true,
  imports: [
    AssetChannelTagsComponent,
    AssetUsageSectionComponent,
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
    AssetTemplateBadgeComponent,
  ],
  templateUrl: './text-asset-detail.component.html',
  styleUrl: './text-asset-detail.component.less',
})
export class TextAssetDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly textAssetsService = inject(TextAssetsService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly translate = inject(TranslateService);
  private readonly adminAuth = inject(AdminAuthService);

  readonly canUpdateTextAsset = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_UPDATE_TEXT_ASSET)
  );
  /** Editing the text is its own permission, separate from editing metadata. */
  readonly canEditContent = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_EDIT_TEXT_ASSET_CONTENT)
  );

  readonly canDeleteTextAsset = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_DELETE_TEXT_ASSET)
  );

  readonly canReview = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_REVIEW_CONTENT)
  );

  readonly textAsset = signal<TextAssetDetails | null>(null);
  readonly loading = signal(true);
  readonly licensesColors = LicensesColors;

  private slug!: string;

  ngOnInit(): void {
    this.slug = this.route.snapshot.params['slug'];
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.textAssetsService.getDetail(this.slug).subscribe({
      next: (data) => {
        this.textAsset.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onEdit(): void {
    void this.router.navigate(['/admin/text-assets', this.slug, 'edit']);
  }

  onEditContent(): void {
    void this.router.navigate(['/admin/text-assets', this.slug, 'edit-content']);
  }

  onReview(): void {
    void this.router.navigate(['/admin/text-assets', this.slug, 'review']);
  }

  onDelete(): void {
    const name = this.textAsset()?.name_ar ?? this.translate.instant('ADMIN.TEXT_ASSETS.TITLE');
    const dir = this.translate.currentLang === 'ar' ? 'rtl' : 'ltr';
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.TEXT_ASSETS.DELETE.CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.TEXT_ASSETS.DELETE.CONFIRM_BODY', { name }),
      nzOkText: this.translate.instant('ADMIN.TEXT_ASSETS.DELETE.OK'),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.TEXT_ASSETS.DELETE.CANCEL'),
      nzDirection: dir,
      nzOnOk: () =>
        this.textAssetsService.delete(this.slug).subscribe({
          next: () => {
            this.message.success(
              this.translate.instant('ADMIN.TEXT_ASSETS.MESSAGES.DELETE_SUCCESS')
            );
            void this.router.navigate(['/admin/text-assets']);
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
