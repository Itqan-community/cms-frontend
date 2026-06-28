import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { Licenses } from '../../../../core/enums/licenses.enum';
import { AssetDetailSkeletonComponent } from '../../../../shared/components/asset-detail-skeleton/asset-detail-skeleton.component';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { ImageCarouselComponent } from '../../../../shared/components/image-carousel/image-carousel.component';
import { LicenseTagComponent } from '../../../../shared/components/license-tag/license-tag.component';
import { StateMessageComponent } from '../../../../shared/components/state-message/state-message.component';
import { IssuesService } from '../../../admin/issues/services/issues.service';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { AssetDetails } from '../../models/assets.model';
import { AssetsService } from '../../services/assets.service';

@Component({
  selector: 'app-asset-details-page',
  imports: [
    RouterModule,
    ImageCarouselComponent,
    BreadcrumbComponent,
    LicenseTagComponent,
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
  ],
  templateUrl: './asset-details.page.html',
  styleUrl: './asset-details.page.less',
})
export class AssetDetailsPage implements OnInit {
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

  readonly id = this.route.snapshot.params['id'];
  asset = signal<AssetDetails | null>(null);
  images = signal<string[]>([]);
  loading = signal<boolean>(true);
  errorState = signal<boolean>(false);
  notFound = signal<boolean>(false);
  isModalVisible = signal<boolean>(false);
  isLicenseModalVisible = signal<boolean>(false);
  canConfirmLicense = signal<boolean>(false);
  isSubmittingRequest = signal<boolean>(false);
  isDownloading = signal<boolean>(false);
  isReportIssueModalVisible = signal<boolean>(false);
  isSubmittingReportIssue = signal<boolean>(false);

  accessRequestForm: FormGroup;
  reportIssueForm: FormGroup;

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
          this.loading.set(false);
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

  retryLoad() {
    this.getAssetDetails(this.id);
  }

  getCategoryIcon(category: string): string {
    switch (category) {
      case 'tafsir':
        return 'lucideFileText';
      case 'translation':
        return 'lucideLanguages';
      case 'recitation':
        return 'lucideMic';
      default:
        return 'lucideFile';
    }
  }

  downloadResource() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/account/login']);
      return;
    }

    const asset = this.asset();
    if (!asset?.id) {
      return;
    }

    if (asset.is_open_access) {
      this.openLicenseModal();
      return;
    }

    this.resolveDownloadAccess(asset.id);
  }

  private resolveDownloadAccess(assetId: number): void {
    this.isDownloading.set(true);
    this.http
      .get<{ download_url: string }>(`${environment.API_BASE_URL}/assets/${assetId}/download/`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDownloading.set(false);
          this.openLicenseModal();
        },
        error: (error: HttpErrorResponse) => {
          this.isDownloading.set(false);
          if (error.status === 401 || error.status === 403) {
            this.openAccessRequestModal();
            return;
          }
          const defaultErrorKey =
            error.status === 0 ? 'ERRORS.NETWORK_ERROR' : 'ERRORS.SERVER_ERROR';
          const errorMessage = getErrorMessage(error) ?? this.translate.instant(defaultErrorKey);
          this.message.error(errorMessage);
        },
      });
  }

  openReportIssueModal() {
    if (!this.authService.isLoggedIn()) {
      void this.router.navigate(['/account/login'], {
        queryParams: { next: `/gallery/asset/${this.id}?reportIssue=1` },
      });
      return;
    }

    this.isReportIssueModalVisible.set(true);
  }

  closeReportIssueModal() {
    this.isReportIssueModalVisible.set(false);
    this.reportIssueForm.reset();
  }

  handleReportIssueModalCancel() {
    this.closeReportIssueModal();
  }

  handleReportIssueModalOk() {
    if (!this.reportIssueForm.valid) {
      this.reportIssueForm.get('description')?.markAsTouched();
      return;
    }

    const asset = this.asset();
    if (!asset?.id) {
      return;
    }

    const description = this.reportIssueForm.value.description ?? '';
    this.isSubmittingReportIssue.set(true);

    this.issuesService
      .create({ asset_id: asset.id, description })
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
          const errorKey =
            error.status === 0 ? 'ERRORS.NETWORK_ERROR' : 'GALLERY.REPORT_ISSUE.ERROR';
          this.message.error(this.translate.instant(errorKey));
        },
      });
  }

  private maybeOpenReportIssueModal(): void {
    const reportIssue = this.route.snapshot.queryParamMap.get('reportIssue');
    if (reportIssue !== '1' || !this.authService.isLoggedIn() || !this.asset()) {
      return;
    }

    this.isReportIssueModalVisible.set(true);
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
            this.openLicenseModal();
          },
          error: (error) => {
            this.isSubmittingRequest.set(false);
            const defaultKey =
              error.status === 0
                ? 'ERRORS.NETWORK_ERROR'
                : 'ACCESS_REQUEST.ERRORS.SUBMISSION_FAILED';
            const errorMessage = getErrorMessage(error) ?? this.translate.instant(defaultKey);
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

  openLicenseModal() {
    this.isLicenseModalVisible.set(true);
    this.canConfirmLicense.set(false);
  }

  closeLicenseModal() {
    this.isLicenseModalVisible.set(false);
    this.canConfirmLicense.set(false);
  }

  handleLicenseScroll(event: Event) {
    const element = event.target as HTMLElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    // Check if scrolled to bottom (with 5px threshold)
    if (scrollTop + clientHeight >= scrollHeight - 5) {
      this.canConfirmLicense.set(true);
    }
  }

  get showScrollHint(): boolean {
    return !this.canConfirmLicense();
  }

  handleLicenseConfirm() {
    // TODO: Handle license confirmation
    this.closeLicenseModal();
    // Proceed with download
    const asset = this.asset();
    if (asset?.id) {
      this.downloadAsset(asset.id);
    }
  }

  downloadOriginalResource() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/account/login']);
      return;
    }

    const asset = this.asset();
    if (!asset?.resource?.id) {
      return;
    }

    this.performResourceDownload(asset.resource.id);
  }

  private downloadAsset(assetId: number): void {
    this.isDownloading.set(true);
    // Step 1: Get the download_url from backend
    this.http
      .get<{ download_url: string }>(`${environment.API_BASE_URL}/assets/${assetId}/download/`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isDownloading.set(false);
          const downloadUrl = response.download_url;
          // Extract filename from URL path
          const filename = this.extractFilenameFromPath(downloadUrl);
          // Step 2: Download the actual file
          this.downloadFileFromUrl(downloadUrl, filename);
        },
        error: (error) => {
          this.isDownloading.set(false);
          const defaultErrorKey =
            error.status === 0 ? 'ERRORS.NETWORK_ERROR' : 'ERRORS.SERVER_ERROR';
          const errorMessage = error.error?.message || this.translate.instant(defaultErrorKey);
          this.message.error(errorMessage);
        },
      });
  }

  private performResourceDownload(resourceId: number): void {
    this.isDownloading.set(true);
    // Step 1: Get the download_url from backend
    this.http
      .get<{
        download_url: string;
      }>(`${environment.API_BASE_URL}/resources/${resourceId}/download/`)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.isDownloading.set(false);
          const downloadUrl = response.download_url;
          // Extract filename from URL path
          const filename = this.extractFilenameFromPath(downloadUrl);
          // Step 2: Download the actual file
          this.downloadFileFromUrl(downloadUrl, filename);
        },
        error: (error) => {
          this.isDownloading.set(false);
          const defaultErrorKey =
            error.status === 0 ? 'ERRORS.NETWORK_ERROR' : 'ERRORS.SERVER_ERROR';
          const errorMessage = error.error?.message || this.translate.instant(defaultErrorKey);
          this.message.error(errorMessage);
        },
      });
  }

  private downloadFileFromUrl(fileUrl: string, filename: string): void {
    // Create link and trigger download
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();

    // Remove the link after a short delay
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  }

  private extractFilenameFromPath(path: string): string {
    // Extract filename from a full path (e.g., "media/uploads/resources/15/versions/100/tr-ab-en_hilali.csv" -> "tr-ab-en_hilali.csv")
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  }

  getLicenseType(license: string): Licenses {
    return license as Licenses;
  }
}
