import { isPlatformServer } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { environment } from '../../../../../environments/environment';
import { JsonLdService } from '../../../../core/services/json-ld.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ViewportService } from '../../../../core/services/viewport.service';
import { AssetCardComponent } from '../../../gallery/components/asset-card/asset-card.component';
import { Asset } from '../../../gallery/models/assets.model';
import { AssetCardSkeletonComponent } from '../../../../shared/components/asset-card-skeleton/asset-card-skeleton.component';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { StateMessageComponent } from '../../../../shared/components/state-message/state-message.component';
import { localizeCountryCodeOrName } from '../../../admin/utils/display-localization.util';
import { ReciterDetail } from '../../models/reciter.model';
import { ReciterService } from '../../services/reciter.service';

@Component({
  selector: 'app-reciter-details-page',
  standalone: true,
  imports: [
    AssetCardComponent,
    TranslateModule,
    BreadcrumbComponent,
    AssetCardSkeletonComponent,
    StateMessageComponent,
    NgIcon,
    NzPaginationModule,
  ],
  templateUrl: './reciter-details.page.html',
  styleUrl: './reciter-details.page.less',
})
export class ReciterDetailsPage implements OnInit, OnDestroy {
  private readonly reciterService = inject(ReciterService);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly viewportService = inject(ViewportService);
  private readonly seo = inject(SeoService);
  private readonly jsonLd = inject(JsonLdService);
  private readonly destroyRef = inject(DestroyRef);

  isServer = isPlatformServer(this.platformId);

  readonly slug = this.route.snapshot.params['slug'];
  reciter = signal<ReciterDetail | null>(null);
  assets = signal<Asset[]>([]);
  reciterLoading = signal<boolean>(true);
  assetsLoading = signal<boolean>(true);
  notFound = signal<boolean>(false);

  readonly page = signal(1);
  readonly pageSize = signal(12);
  readonly assetsTotal = signal(0);
  readonly pageSizeOptions: number[] = [12, 24, 48];

  ngOnInit() {
    this.getReciterDetails();
  }

  getSkeletonArray() {
    if (this.isServer) {
      return [];
    }
    const count = this.viewportService.isMobile() ? 4 : 8;
    return Array.from({ length: count });
  }

  getReciterDetails() {
    this.reciterLoading.set(true);
    this.notFound.set(false);
    this.reciterService
      .getReciter(this.slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reciter) => {
          this.reciter.set(reciter);
          this.setSeoFromReciter(reciter);
          this.getAssets(reciter.id);
        },
        error: (err) => {
          this.reciterLoading.set(false);
          this.assetsLoading.set(false);
          if (err instanceof HttpErrorResponse && err.status === 404) {
            this.notFound.set(true);
          }
        },
        complete: () => this.reciterLoading.set(false),
      });
  }

  ngOnDestroy(): void {
    this.jsonLd.remove();
  }

  private setSeoFromReciter(reciter: ReciterDetail): void {
    const isAr = this.translate.currentLang === 'ar';
    const name = isAr ? reciter.name_ar : reciter.name_en;
    const alternateName = isAr ? reciter.name_en : reciter.name_ar;
    const bio = isAr ? reciter.bio_ar : reciter.bio_en;
    const description = bio || `${name} - Quran reciter on ITQAN.`;

    this.seo.setSeo({
      title: `${name} | ITQAN`,
      description,
      path: `/reciters/${reciter.slug}`,
      image: reciter.image_url || undefined,
      type: 'profile',
    });

    this.jsonLd.setSchema({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name,
      alternateName: alternateName || undefined,
      description,
      image: reciter.image_url || undefined,
      url: `${environment.SITE_URL}/reciters/${reciter.slug}`,
      nationality: reciter.nationality || undefined,
      jobTitle: 'Quran Reciter',
      deathDate: reciter.date_of_death || undefined,
    });
  }

  getAssets(reciterId: number) {
    this.assetsLoading.set(true);
    this.reciterService
      .getReciterAssets(reciterId, this.page(), this.pageSize())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.assets.set(response.results);
          this.assetsTotal.set(response.count ?? response.results.length);
        },
        complete: () => this.assetsLoading.set(false),
        error: () => {
          this.assets.set([]);
          this.assetsTotal.set(0);
          this.assetsLoading.set(false);
        },
      });
  }

  onPageChange(index: number): void {
    this.page.set(index);
    const reciter = this.reciter();
    if (reciter) {
      this.getAssets(reciter.id);
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    const reciter = this.reciter();
    if (reciter) {
      this.getAssets(reciter.id);
    }
  }

  getReciterName(): string {
    const reciter = this.reciter();
    if (!reciter) {
      return '';
    }
    return this.translate.currentLang === 'ar' ? reciter.name_ar : reciter.name_en;
  }

  getReciterBio(): string {
    const reciter = this.reciter();
    if (!reciter) {
      return '';
    }
    return this.translate.currentLang === 'ar' ? reciter.bio_ar : reciter.bio_en;
  }

  get nationalityLabel(): string {
    const reciter = this.reciter();
    return localizeCountryCodeOrName(reciter?.nationality, this.translate.currentLang, {
      empty: this.translate.instant('COMMON.EM_DASH'),
    });
  }
}
