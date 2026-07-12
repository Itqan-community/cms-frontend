import { isPlatformServer } from '@angular/common';
import { Component, DestroyRef, inject, OnDestroy, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { JsonLdService } from '../../../../core/services/json-ld.service';
import { SeoService } from '../../../../core/services/seo.service';
import { ViewportService } from '../../../../core/services/viewport.service';
import { AssetCardComponent } from '../../../../features/gallery/components/asset-card/asset-card.component';
import { AssetCardSkeletonComponent } from '../../../../shared/components/asset-card-skeleton/asset-card-skeleton.component';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { FiltersComponent } from '../../../../shared/components/filters/filters.component';
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
    NgIcon,
    NzPaginationModule,
  ],
  templateUrl: './publisher-details.page.html',
  styleUrl: './publisher-details.page.less',
})
export class PublisherDetailsPage implements OnInit, OnDestroy {
  private readonly publisherService = inject(PublisherService);
  private readonly route = inject(ActivatedRoute);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly viewportService = inject(ViewportService);
  private readonly seo = inject(SeoService);
  private readonly jsonLd = inject(JsonLdService);
  private readonly destroyRef = inject(DestroyRef);

  isServer = isPlatformServer(this.platformId);

  readonly id = this.route.snapshot.params['id'];
  publisher = signal<Publisher | null>(null);
  assets = signal<Asset[]>([]);
  publisherLoading = signal<boolean>(true);
  assetsLoading = signal<boolean>(true);

  categoriesSelection = signal<string[]>([]);
  searchQuery = signal<string>('');
  licensesSelection = signal<string[]>([]);

  readonly page = signal(1);
  readonly pageSize = signal(12);
  readonly assetsTotal = signal(0);
  readonly pageSizeOptions: number[] = [12, 24, 48];

  ngOnInit() {
    this.getPublisherDetails();
    this.getAssets();
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
    this.publisherService
      .getPublisher(this.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (publisher) => {
          this.publisher.set(publisher);
          this.setSeoFromPublisher(publisher);
        },
        complete: () => this.publisherLoading.set(false),
        error: () => this.publisherLoading.set(false),
      });
  }

  ngOnDestroy(): void {
    this.jsonLd.remove();
  }

  private setSeoFromPublisher(publisher: Publisher): void {
    const description = publisher.description || `${publisher.name} on ITQAN.`;
    this.seo.setSeo({
      title: `${publisher.name} | ITQAN`,
      description,
      path: `/publisher/${publisher.id}`,
      image: publisher.icon_url || undefined,
    });
    this.jsonLd.setSchema({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: publisher.name,
      description,
      url: publisher.website || undefined,
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
        error: () => {
          this.assets.set([]);
          this.assetsTotal.set(0);
          this.assetsLoading.set(false);
        },
      });
  }

  searchQueryChange(event: string) {
    this.searchQuery.set(event);
    this.page.set(1);
    this.getAssets();
  }

  categoriesSelectionChange(event: string[]) {
    this.categoriesSelection.set(event);
    this.page.set(1);
    this.getAssets();
  }

  licensesSelectionChange(event: string[]) {
    this.licensesSelection.set(event);
    this.page.set(1);
    this.getAssets();
  }

  onPageChange(index: number): void {
    this.page.set(index);
    this.getAssets();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.getAssets();
  }

  getPublisherIconUrl(): string {
    const publisher = this.publisher();
    return publisher?.icon_url || '';
  }
}
