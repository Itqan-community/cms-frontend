import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NgIcon } from '@ng-icons/core';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { Licenses } from '../../../../core/enums/licenses.enum';
import { AssetTemplateBadgeComponent } from '../../../../shared/components/asset-template-badge/asset-template-badge.component';
import { JsonLdService } from '../../../../core/services/json-ld.service';
import { SeoService } from '../../../../core/services/seo.service';
import { AssetDetailSkeletonComponent } from '../../../../shared/components/asset-detail-skeleton/asset-detail-skeleton.component';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { ImageCarouselComponent } from '../../../../shared/components/image-carousel/image-carousel.component';
import { LicenseTagComponent } from '../../../../shared/components/license-tag/license-tag.component';
import { StateMessageComponent } from '../../../../shared/components/state-message/state-message.component';
import { resolveApiErrorMessage } from '../../../../shared/utils/api-error-resolver.util';
import { IssueContextFieldsComponent } from '../../../admin/issues/components/issue-context-fields/issue-context-fields.component';
import { IssuesService } from '../../../admin/issues/services/issues.service';
import {
  createIssueContextForm,
  issueContextFromForm,
  issueContextKind,
  markIssueContextTouched,
  setIssueContextRequired,
} from '../../../admin/issues/utils/issue-context.util';
import { localizedLanguageName } from '../../../admin/utils/iso-639.util';
import { AssetDetails } from '../../models/assets.model';
import { assetKindIcon } from '../../../../core/enums/categories.enum';
import { AssetFileStructureComponent } from '../../components/asset-file-structure/asset-file-structure.component';
import { AssetFontPreviewComponent } from '../../components/asset-font-preview/asset-font-preview.component';
import { AssetRecitationPreviewComponent } from '../../components/asset-recitation-preview/asset-recitation-preview.component';
import { AssetGetCtaComponent } from '../../components/asset-get-cta/asset-get-cta.component';
import { preferredLanguage } from '../../utils/preferred-language.util';
import { AssetsService } from '../../services/assets.service';
import { AssetUsageCountsComponent } from '../../../usage/components/asset-usage-counts/asset-usage-counts.component';

@Component({
  selector: 'app-asset-details-page',
  imports: [
    AssetFileStructureComponent,
    AssetFontPreviewComponent,
    AssetRecitationPreviewComponent,
    AssetUsageCountsComponent,
    RouterModule,
    ImageCarouselComponent,
    BreadcrumbComponent,
    LicenseTagComponent,
    AssetTemplateBadgeComponent,
    StateMessageComponent,
    AssetDetailSkeletonComponent,
    TranslateModule,
    NzButtonModule,
    NzTagModule,
    NgIcon,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    ReactiveFormsModule,
    FormsModule,
    AssetGetCtaComponent,
    IssueContextFieldsComponent,
  ],
  templateUrl: './asset-details.page.html',
  styleUrl: './asset-details.page.less',
})
export class AssetDetailsPage implements OnInit, OnDestroy {
  private readonly assetsService = inject(AssetsService);
  private readonly issuesService = inject(IssuesService);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly message = inject(NzMessageService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly seo = inject(SeoService);
  private readonly jsonLd = inject(JsonLdService);

  readonly id = this.route.snapshot.params['id'];
  asset = signal<AssetDetails | null>(null);
  images = signal<string[]>([]);
  loading = signal<boolean>(true);
  errorState = signal<boolean>(false);
  notFound = signal<boolean>(false);
  isModalVisible = signal<boolean>(false);
  isSubmittingRequest = signal<boolean>(false);
  /** Language chosen for the install command and the previews (null = source/default).
   *  Starts at the UI language when the asset offers it and follows UI language
   *  changes until the user picks one. */
  selectedLanguage = signal<string | null>(null);
  private languagePicked = false;
  isReportIssueModalVisible = signal<boolean>(false);
  isSubmittingReportIssue = signal<boolean>(false);

  accessRequestForm: FormGroup;
  reportIssueForm: FormGroup;
  /** Where in the asset the reported issue is; fields follow the asset's category. */
  readonly reportIssueContextForm = createIssueContextForm();
  readonly reportIssueContextKind = computed(() => issueContextKind(this.asset()?.category));

  usageOptions = [{ value: 'commercial' }, { value: 'non-commercial' }];

  constructor() {
    this.accessRequestForm = this.fb.group({
      intended_use: ['', [Validators.required]],
      purpose: ['', [Validators.required]],
    });
    this.reportIssueForm = this.fb.group({
      description: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  ngOnInit() {
    this.getAssetDetails(this.id);
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(({ lang }) => {
      const asset = this.asset();
      if (asset && !this.languagePicked) {
        this.selectedLanguage.set(preferredLanguage(asset.available_languages ?? [], lang));
      }
    });
  }

  /** The user chose a language (language select or preview switch): keep it. */
  pickLanguage(language: string | null): void {
    this.languagePicked = true;
    this.selectedLanguage.set(language);
  }

  getAssetDetails(id: string) {
    this.loading.set(true);
    this.errorState.set(false);
    this.notFound.set(false);
    this.assetsService
      .getAssetDetails(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (asset) => {
          this.asset.set(asset);
          this.images.set(asset.snapshots.map((snapshot) => snapshot.image_url));
          this.selectedLanguage.set(
            preferredLanguage(asset.available_languages ?? [], this.translate.currentLang)
          );
          this.loading.set(false);
          this.setSeoFromAsset(asset);
          this.maybeOpenReportIssueModal();
        },
        error: (err) => {
          this.loading.set(false);
          if (err instanceof HttpErrorResponse && err.status === 404) {
            this.notFound.set(true);
          } else {
            this.errorState.set(true);
          }
        },
      });
  }

  ngOnDestroy(): void {
    this.jsonLd.remove();
  }

  private setSeoFromAsset(asset: AssetDetails): void {
    const description =
      asset.description || asset.long_description || `${asset.name} - available on ITQAN.`;
    this.seo.setSeo({
      title: `${asset.name} | ITQAN`,
      description,
      path: `/gallery/asset/${asset.id}`,
      image: asset.thumbnail_url || undefined,
    });
    this.jsonLd.setSchema({
      '@context': 'https://schema.org',
      '@type': 'CreativeWork',
      name: asset.name,
      description,
      image: asset.thumbnail_url || undefined,
      creator: {
        '@type': 'Organization',
        name: asset.publisher?.name,
      },
    });
  }

  retryLoad() {
    this.getAssetDetails(this.id);
  }

  getCategoryIcon(asset: AssetDetails): string {
    return assetKindIcon(asset.category, asset.tags);
  }

  /** A text asset is labelled by its tags (Tafsir, Translation); the rest by category. */
  categoryLabel(asset: AssetDetails): string {
    if (asset.tags?.length)
      return asset.tags
        .map((tag) => tag.name)
        .join(this.translate.currentLang === 'ar' ? '، ' : ', ');
    return this.translate.instant('CATEGORIES.' + asset.category);
  }

  /** Language name localized to the current UI language (e.g. fr → "الفرنسية"). */
  languageName(code: string): string {
    return localizedLanguageName(code, this.translate.currentLang || 'en');
  }

  /** "Request access" shows until the user has access; open-access assets need none. */
  showRequestAccess(): boolean {
    const asset = this.asset();
    if (!asset || asset.is_open_access) {
      return false;
    }
    return !this.authService.isLoggedIn() || asset.access_status !== 'approved';
  }

  /** A pending or rejected request can't be sent again; the hint below says why. */
  isRequestAccessBlocked(): boolean {
    if (!this.authService.isLoggedIn()) {
      return false;
    }

    const status = this.asset()?.access_status ?? null;
    return status === 'pending' || status === 'rejected';
  }

  requestAccess() {
    if (!this.authService.isLoggedIn()) {
      void this.router.navigate(['/account/login'], {
        queryParams: { next: this.router.url },
      });
      return;
    }

    // The backend sends null only for open access or anonymous users; treat a missing status as
    // not requested so the enabled button never does nothing.
    if ((this.asset()?.access_status ?? 'not_requested') === 'not_requested') {
      this.openAccessRequestModal();
    }
  }

  private refreshAssetDetails(): Observable<AssetDetails> {
    return this.assetsService.getAssetDetails(this.id);
  }

  private applyRefreshedAsset(asset: AssetDetails): void {
    this.asset.set(asset);
    this.images.set(asset.snapshots.map((snapshot) => snapshot.image_url));
  }

  private handleAccessStatusAfterRequest(status: AssetDetails['access_status']): void {
    if (status === 'approved' || status == null) {
      this.message.success(this.translate.instant('GALLERY.ACCESS_REQUEST_APPROVED'));
      return;
    }

    if (status === 'pending') {
      this.message.success(this.translate.instant('GALLERY.ACCESS_REQUEST_SUBMITTED_PENDING'));
      return;
    }

    if (status === 'rejected') {
      this.message.warning(this.translate.instant('GALLERY.ACCESS_REJECTED_TOAST'));
      return;
    }

    this.message.error(this.translate.instant('ACCESS_REQUEST.ERRORS.SUBMISSION_FAILED'));
  }

  openReportIssueModal() {
    if (!this.authService.isLoggedIn()) {
      void this.router.navigate(['/account/login'], {
        queryParams: { next: `/gallery/asset/${this.id}?reportIssue=1` },
      });
      return;
    }

    this.showReportIssueModal();
  }

  /** Open the modal with the location fields required for this asset's category. */
  private showReportIssueModal(): void {
    this.reportIssueContextForm.reset();
    setIssueContextRequired(this.reportIssueContextKind(), this.reportIssueContextForm);
    this.isReportIssueModalVisible.set(true);
  }

  closeReportIssueModal() {
    this.isReportIssueModalVisible.set(false);
    this.reportIssueForm.reset();
    this.reportIssueContextForm.reset();
  }

  handleReportIssueModalCancel() {
    this.closeReportIssueModal();
  }

  handleReportIssueModalOk() {
    if (!this.reportIssueForm.valid || this.reportIssueContextForm.invalid) {
      this.reportIssueForm.get('description')?.markAsTouched();
      markIssueContextTouched(this.reportIssueContextForm);
      return;
    }

    const asset = this.asset();
    if (!asset?.id) {
      return;
    }

    const description = this.reportIssueForm.value.description ?? '';
    const context = issueContextFromForm(
      this.reportIssueContextKind(),
      this.reportIssueContextForm
    );
    this.isSubmittingReportIssue.set(true);

    this.issuesService
      .create({ asset_id: asset.id, description, context })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmittingReportIssue.set(false);
          this.message.success(this.translate.instant('GALLERY.REPORT_ISSUE.SUCCESS'));
          this.closeReportIssueModal();
        },
        error: (error) => {
          this.isSubmittingReportIssue.set(false);
          if (error.status === 401) {
            this.message.error(this.translate.instant('GALLERY.REPORT_ISSUE.LOGIN_REQUIRED'));
            return;
          }
          if (error.status === 403) {
            this.message.error(this.translate.instant('GALLERY.REPORT_ISSUE.FORBIDDEN'));
            return;
          }
          const fallbackKey =
            error.status === 0 ? 'ERRORS.NETWORK_ERROR' : 'GALLERY.REPORT_ISSUE.ERROR';
          this.message.error(resolveApiErrorMessage(error, { fallbackKey }, this.translate));
        },
      });
  }

  private maybeOpenReportIssueModal(): void {
    const reportIssue = this.route.snapshot.queryParamMap.get('reportIssue');
    if (reportIssue !== '1' || !this.authService.isLoggedIn() || !this.asset()) {
      return;
    }

    this.showReportIssueModal();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { reportIssue: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  openAccessRequestModal() {
    this.isModalVisible.set(true);
  }

  closeAccessRequestModal() {
    this.isModalVisible.set(false);
    this.accessRequestForm.reset();
  }

  handleModalCancel() {
    this.closeAccessRequestModal();
  }

  handleModalOk() {
    if (this.accessRequestForm.valid) {
      const asset = this.asset();
      if (!asset?.id) {
        return;
      }

      const formData = {
        intended_use: this.accessRequestForm.value.intended_use,
        purpose: this.accessRequestForm.value.purpose,
      };

      this.isSubmittingRequest.set(true);

      this.http
        .post(`${environment.API_BASE_URL}/assets/${asset.id}/request-access/`, formData)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.isSubmittingRequest.set(false);
            this.closeAccessRequestModal();
            this.refreshAssetDetails()
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (refreshed) => {
                  this.applyRefreshedAsset(refreshed);
                  this.handleAccessStatusAfterRequest(refreshed.access_status);
                },
                error: (error) => {
                  const errorMessage = resolveApiErrorMessage(
                    error,
                    {
                      fallbackKey:
                        error.status === 0
                          ? 'ERRORS.NETWORK_ERROR'
                          : 'ACCESS_REQUEST.ERRORS.SUBMISSION_FAILED',
                    },
                    this.translate
                  );
                  this.message.error(errorMessage);
                },
              });
          },
          error: (error) => {
            this.isSubmittingRequest.set(false);
            const errorMessage = resolveApiErrorMessage(
              error,
              {
                fallbackKey:
                  error.status === 0
                    ? 'ERRORS.NETWORK_ERROR'
                    : 'ACCESS_REQUEST.ERRORS.SUBMISSION_FAILED',
              },
              this.translate
            );
            this.message.error(errorMessage);
          },
        });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.accessRequestForm.controls).forEach((key) => {
        this.accessRequestForm.get(key)?.markAsTouched();
      });
    }
  }

  getLicenseType(license: string): Licenses {
    return license as Licenses;
  }
}
