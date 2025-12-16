import { HttpClient } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/auth/services/auth.service';
import { Licenses } from '../../../../core/enums/licenses.enum';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { ImageCarouselComponent } from '../../../../shared/components/image-carousel/image-carousel.component';
import { LicenseTagComponent } from '../../../../shared/components/license-tag/license-tag.component';
import { AssetDetails } from '../../models/assets.model';
import { AssetsService } from '../../services/assets.service';

@Component({
  selector: 'app-asset-details-page',
  standalone: true,
  imports: [
    RouterModule,
    ImageCarouselComponent,
    BreadcrumbComponent,
    LicenseTagComponent,
    TranslateModule,
    NzButtonModule,
    NzTagModule,
    NzIconModule,
    NzSpinModule,
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
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  readonly id = this.route.snapshot.params['id'];
  asset = signal<AssetDetails | null>(null);
  images = signal<string[]>([]);
  loading = signal<boolean>(true);
  isModalVisible = signal<boolean>(false);
  isLicenseModalVisible = signal<boolean>(false);
  canConfirmLicense = signal<boolean>(false);

  accessRequestForm: FormGroup;

  usageOptions = [{ value: 'commercial' }, { value: 'non-commercial' }];

  constructor() {
    this.accessRequestForm = this.fb.group({
      intended_use: ['', [Validators.required]],
      purpose: ['', [Validators.required]],
    });
  }

  ngOnInit() {
    this.getAssetDetails(this.id);
  }

  getAssetDetails(id: string) {
    this.loading.set(true);
    this.assetsService.getAssetDetails(id).subscribe({
      next: (asset) => {
        this.asset.set(asset);
        this.images.set(asset.snapshots.map((snapshot) => snapshot.image_url));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  getCategoryIcon(category: string): string {
    // TODO: move this function to a shared utility
    switch (category) {
      case 'mushaf':
        return 'book-bookmark';
      case 'tafsir':
        return 'file-detail';
      case 'recitation':
        return 'microphone';
      default:
        return 'file';
    }
  }

  downloadResource() {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    const asset = this.asset();
    if (!asset?.id) {
      return;
    }

    // Open access request modal instead of directly downloading
    this.openAccessRequestModal();
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

      this.http
        .post(`${environment.API_BASE_URL}/assets/${asset.id}/request-access/`, formData)
        .subscribe({
          next: () => {
            this.closeAccessRequestModal();
            this.openLicenseModal();
          },
          error: (error) => {
            console.error('Access request failed:', error);
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
      this.router.navigate(['/login']);
      return;
    }

    const asset = this.asset();
    if (!asset?.resource?.id) {
      return;
    }

    this.performResourceDownload(asset.resource.id);
  }

  private downloadAsset(assetId: number): void {
    // Step 1: Get the download_url from backend
    this.http
      .get<{ download_url: string }>(`${environment.API_BASE_URL}/assets/${assetId}/download/`)
      .subscribe({
        next: (response) => {
          const downloadUrl = response.download_url;
          // Extract filename from URL path
          const filename = this.extractFilenameFromPath(downloadUrl);
          // Step 2: Download the actual file
          this.downloadFileFromUrl(downloadUrl, filename);
        },
        error: (error) => {
          console.error('Failed to get download URL:', error);
        },
      });
  }

  private performResourceDownload(resourceId: number): void {
    // Step 1: Get the download_url from backend
    this.http
      .get<{
        download_url: string;
      }>(`${environment.API_BASE_URL}/resources/${resourceId}/download/`)
      .subscribe({
        next: (response) => {
          const downloadUrl = response.download_url;
          // Extract filename from URL path
          const filename = this.extractFilenameFromPath(downloadUrl);
          // Step 2: Download the actual file
          this.downloadFileFromUrl(downloadUrl, filename);
        },
        error: (error) => {
          console.error('Failed to get download URL:', error);
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
