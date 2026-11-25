import { isPlatformServer } from '@angular/common';
import {
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  RESPONSE_INIT,
  signal,
  TransferState,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { skip } from 'rxjs';
import { UI_LANGUAGE } from '../../../../core/i18n/ui-language';
import { JsonLdService } from '../../../../core/services/json-ld.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ViewportService } from '../../../../core/services/viewport.service';
import {
  consumeSsrStatus,
  recordSsrError,
  ssrStatusKey,
} from '../../../../core/ssr/ssr-http-status.util';
import { AssetCardComponent } from '../../../gallery/components/asset-card/asset-card.component';
import { Asset } from '../../../gallery/models/assets.model';
import { AssetCardSkeletonComponent } from '../../../../shared/components/asset-card-skeleton/asset-card-skeleton.component';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import {
  CrawlablePaginationComponent,
  parsePositivePageParam,
} from '../../../../shared/components/crawlable-pagination/crawlable-pagination.component';
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
    CrawlablePaginationComponent,
  ],
  templateUrl: './reciter-details.page.html',
  styleUrl: './reciter-details.page.less',
})
export class ReciterDetailsPage implements OnInit, OnDestroy {
  private readonly reciterService = inject(ReciterService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly uiLanguage = inject(UI_LANGUAGE);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly viewportService = inject(ViewportService);
  private readonly seo = inject(SeoService);
  private readonly jsonLd = inject(JsonLdService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly transferState = inject(TransferState);
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });

  isServer = isPlatformServer(this.platformId);

  readonly slug = this.route.snapshot.params['slug'];
  reciter = signal<ReciterDetail | null>(null);
  assets = signal<Asset[]>([]);
  reciterLoading = signal<boolean>(true);
  assetsLoading = signal<boolean>(true);
  private serverAssetsFailed = false;
  notFound = signal<boolean>(false);
  errorState = signal<boolean>(false);

  readonly page = signal(parsePositivePageParam(this.route.snapshot.queryParamMap.get('page')));
  readonly pageSize = signal(12);
  readonly assetsTotal = signal(0);
  readonly pageSizeOptions: number[] = [12, 24, 48];

  ngOnInit() {
    this.route.queryParamMap
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const nextPage = parsePositivePageParam(params.get('page'));
        if (nextPage !== this.page()) {
          this.page.set(nextPage);
          const reciter = this.reciter();
          if (reciter) {
            this.setSeoFromReciter(reciter);
            this.getAssets(reciter.id);
          }
        }
      });

    const ssrStatus = consumeSsrStatus(
      this.platformId,
      this.transferState,
      ssrStatusKey('reciter', this.slug)
    );
    if (ssrStatus === 'not_found') {
      this.notFound.set(true);
      this.reciterLoading.set(false);
      this.assetsLoading.set(false);
      this.setNotFoundSeo();
      return;
    }
    if (ssrStatus === 'error') {
      this.errorState.set(true);
      this.reciterLoading.set(false);
      this.assetsLoading.set(false);
      return;
    }
    // The server already failed the assets call and rendered the empty state; keep it on hydration.
    this.serverAssetsFailed =
      consumeSsrStatus(
        this.platformId,
        this.transferState,
        ssrStatusKey('reciter-assets', `${this.slug}:p${this.page()}`)
      ) === 'error';
    if (this.serverAssetsFailed) {
      this.assets.set([]);
      this.assetsTotal.set(0);
      this.assetsLoading.set(false);
    }
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
    this.errorState.set(false);
    this.reciterService
      .getReciter(this.slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (reciter) => {
          this.reciter.set(reciter);
          this.setSeoFromReciter(reciter);
          if (this.serverAssetsFailed) {
            this.serverAssetsFailed = false;
            return;
          }
          this.getAssets(reciter.id);
        },
        error: (err) => {
          this.reciterLoading.set(false);
          this.assetsLoading.set(false);
          const ssrStatus = recordSsrError(
            this.platformId,
            this.transferState,
            this.responseInit,
            ssrStatusKey('reciter', this.slug),
            err
          );
          if (ssrStatus === 'not_found') {
            this.notFound.set(true);
            this.setNotFoundSeo();
          } else {
            this.errorState.set(true);
          }
        },
        complete: () => this.reciterLoading.set(false),
      });
  }

  private setNotFoundSeo(): void {
    const title = this.translate.instant('RECITERS.NOT_FOUND_TITLE');
    const description = this.translate.instant('RECITERS.NOT_FOUND_MESSAGE');
    this.seo.setSeo({
      title: `${title} | ${this.seo.brandName()}`,
      description,
      path: `/reciters/${encodeURIComponent(this.slug)}`,
      noIndex: true,
    });
    this.jsonLd.remove();
  }

  ngOnDestroy(): void {
    this.jsonLd.remove();
    this.seo.resetToDefault(this.translate.currentLang || this.uiLanguage);
  }

  private setSeoFromReciter(reciter: ReciterDetail): void {
    const isAr = (this.translate.currentLang || this.uiLanguage) === 'ar';
    const brand = this.seo.brandName();
    const page = this.page();
    const name = isAr ? reciter.name_ar : reciter.name_en;
    const alternateName = isAr ? reciter.name_en : reciter.name_ar;
    const bio = isAr ? reciter.bio_ar : reciter.bio_en;
    const fallback = isAr
      ? `${name} — قارئ قرآن على منصة ${brand}.`
      : `${name} — Quran reciter on ${brand}.`;
    const description = bio || fallback;
    const baseTitle = `${name} | ${brand}`;
    const title = page > 1 ? `${baseTitle} (${isAr ? `صفحة ${page}` : `Page ${page}`})` : baseTitle;
    const pageUrl = this.seo.canonicalUrl(`/reciters/${reciter.slug}`, page);

    this.seo.setSeo({
      title,
      description,
      path: `/reciters/${reciter.slug}`,
      page,
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
      url: pageUrl,
      inLanguage: isAr ? 'ar' : 'en',
      nationality: reciter.nationality || undefined,
      jobTitle: isAr ? 'قارئ قرآن' : 'Quran Reciter',
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
        error: (err) => {
          this.assets.set([]);
          this.assetsTotal.set(0);
          this.assetsLoading.set(false);
          if (!this.notFound()) {
            recordSsrError(
              this.platformId,
              this.transferState,
              this.responseInit,
              ssrStatusKey('reciter-assets', `${this.slug}:p${this.page()}`),
              err,
              { allow404: false }
            );
          }
        },
      });
  }

  onPageChange(index: number): void {
    this.page.set(index);
    this.syncPageQueryParam(index);
    const reciter = this.reciter();
    if (reciter) {
      this.setSeoFromReciter(reciter);
      this.getAssets(reciter.id);
    }
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.syncPageQueryParam(1);
    const reciter = this.reciter();
    if (reciter) {
      this.setSeoFromReciter(reciter);
      this.getAssets(reciter.id);
    }
  }

  private syncPageQueryParam(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
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
