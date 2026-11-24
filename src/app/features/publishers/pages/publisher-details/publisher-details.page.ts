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
import { AssetCardComponent } from '../../../../features/gallery/components/asset-card/asset-card.component';
import { AssetCardSkeletonComponent } from '../../../../shared/components/asset-card-skeleton/asset-card-skeleton.component';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import {
  CrawlablePaginationComponent,
  parsePositivePageParam,
} from '../../../../shared/components/crawlable-pagination/crawlable-pagination.component';
import { FiltersComponent } from '../../../../shared/components/filters/filters.component';
import { StateMessageComponent } from '../../../../shared/components/state-message/state-message.component';
import { Asset } from '../../../gallery/models/assets.model';
import { Publisher, PublisherService } from '../../services/publisher.service';

@Component({
  selector: 'app-publisher-details-page',
  standalone: true,
  imports: [
    FiltersComponent,
    AssetCardComponent,
    TranslateModule,
    BreadcrumbComponent,
    AssetCardSkeletonComponent,
    StateMessageComponent,
    NgIcon,
    CrawlablePaginationComponent,
  ],
  templateUrl: './publisher-details.page.html',
  styleUrl: './publisher-details.page.less',
})
export class PublisherDetailsPage implements OnInit, OnDestroy {
  private readonly publisherService = inject(PublisherService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly uiLanguage = inject(UI_LANGUAGE);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly viewportService = inject(ViewportService);
  private readonly seo = inject(SeoService);
  private readonly jsonLd = inject(JsonLdService);
  private readonly translate = inject(TranslateService);
  private readonly transferState = inject(TransferState);
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  isServer = isPlatformServer(this.platformId);

  readonly id = this.route.snapshot.params['id'];
  publisher = signal<Publisher | null>(null);
  assets = signal<Asset[]>([]);
  publisherLoading = signal<boolean>(true);
  assetsLoading = signal<boolean>(true);
  notFound = signal<boolean>(false);

  categoriesSelection = signal<string[]>([]);
  searchQuery = signal<string>('');
  licensesSelection = signal<string[]>([]);

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
          const pub = this.publisher();
          if (pub) {
            this.setSeoFromPublisher(pub);
          }
          this.getAssets();
        }
      });

    const pubStatus = consumeSsrStatus(
      this.platformId,
      this.transferState,
      ssrStatusKey('publisher', this.id)
    );
    if (pubStatus === 'not_found') {
      this.notFound.set(true);
      this.publisherLoading.set(false);
      this.assetsLoading.set(false);
      this.setNotFoundSeo();
      return;
    }
    if (pubStatus === 'error') {
      this.publisherLoading.set(false);
    } else {
      this.getPublisherDetails();
    }

    const assetsStatus = consumeSsrStatus(
      this.platformId,
      this.transferState,
      ssrStatusKey('publisher-assets', `${this.id}:p${this.page()}`)
    );
    if (assetsStatus === 'error') {
      this.assets.set([]);
      this.assetsTotal.set(0);
      this.assetsLoading.set(false);
    } else {
      this.getAssets();
    }
  }

  getSkeletonArray() {
    if (this.isServer) {
      return [];
    }
    const count = this.viewportService.isMobile() ? 4 : 8;
    return Array.from({ length: count });
  }

  getPublisherDetails() {
    this.publisherLoading.set(true);
    this.notFound.set(false);
    this.publisherService
      .getPublisher(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (publisher) => {
          this.publisher.set(publisher);
          this.setSeoFromPublisher(publisher);
        },
        complete: () => this.publisherLoading.set(false),
        error: (err) => {
          this.publisherLoading.set(false);
          const ssrStatus = recordSsrError(
            this.platformId,
            this.transferState,
            this.responseInit,
            ssrStatusKey('publisher', this.id),
            err
          );
          if (ssrStatus === 'not_found') {
            this.notFound.set(true);
            this.assetsLoading.set(false);
            this.setNotFoundSeo();
          }
        },
      });
  }

  private setNotFoundSeo(): void {
    const title = this.translate.instant('ERRORS.PUBLISHER_NOT_FOUND_TITLE');
    const description = this.translate.instant('ERRORS.PUBLISHER_NOT_FOUND_MESSAGE');
    this.seo.setSeo({
      title: `${title} | ${this.seo.brandName()}`,
      description,
      path: `/publisher/${encodeURIComponent(this.id)}`,
      noIndex: true,
    });
    this.jsonLd.remove();
  }

  ngOnDestroy(): void {
    this.jsonLd.remove();
    this.seo.resetToDefault(this.translate.currentLang || this.uiLanguage);
  }

  private setSeoFromPublisher(publisher: Publisher): void {
    const isAr = (this.translate.currentLang || this.uiLanguage) === 'ar';
    const brand = this.seo.brandName();
    const page = this.page();
    const fallback = isAr
      ? `${publisher.name} — ناشر للمحتوى القرآني على منصة ${brand}.`
      : `${publisher.name} — Quranic content publisher on ${brand}.`;
    const description = publisher.description || fallback;
    const baseTitle = `${publisher.name} | ${brand}`;
    const title = page > 1 ? `${baseTitle} (${isAr ? `صفحة ${page}` : `Page ${page}`})` : baseTitle;

    this.seo.setSeo({
      title,
      description,
      path: `/publisher/${publisher.id}`,
      page,
      image: publisher.icon_url || undefined,
    });
    this.jsonLd.setSchema({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: publisher.name,
      description,
      url: publisher.website || undefined,
      mainEntityOfPage: this.seo.canonicalUrl(`/publisher/${publisher.id}`, page),
      inLanguage: isAr ? 'ar' : 'en',
      logo: publisher.icon_url || undefined,
    });
  }

  getAssets() {
    this.assetsLoading.set(true);
    this.publisherService
      .getPublisherAssets(
        this.id,
        this.categoriesSelection(),
        this.searchQuery(),
        this.licensesSelection(),
        this.page(),
        this.pageSize()
      )
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
              ssrStatusKey('publisher-assets', `${this.id}:p${this.page()}`),
              err,
              { allow404: false }
            );
          }
        },
      });
  }

  searchQueryChange(event: string) {
    this.searchQuery.set(event);
    this.page.set(1);
    this.syncPageQueryParam(1);
    if (this.publisher()) this.setSeoFromPublisher(this.publisher()!);
    this.getAssets();
  }

  categoriesSelectionChange(event: string[]) {
    this.categoriesSelection.set(event);
    this.page.set(1);
    this.syncPageQueryParam(1);
    if (this.publisher()) this.setSeoFromPublisher(this.publisher()!);
    this.getAssets();
  }

  licensesSelectionChange(event: string[]) {
    this.licensesSelection.set(event);
    this.page.set(1);
    this.syncPageQueryParam(1);
    if (this.publisher()) this.setSeoFromPublisher(this.publisher()!);
    this.getAssets();
  }

  onPageChange(index: number): void {
    this.page.set(index);
    this.syncPageQueryParam(index);
    if (this.publisher()) this.setSeoFromPublisher(this.publisher()!);
    this.getAssets();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.syncPageQueryParam(1);
    if (this.publisher()) this.setSeoFromPublisher(this.publisher()!);
    this.getAssets();
  }

  private syncPageQueryParam(page: number): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page > 1 ? page : null },
      queryParamsHandling: 'merge',
    });
  }

  getPublisherIconUrl(): string {
    const publisher = this.publisher();
    return publisher?.icon_url || '';
  }
}
