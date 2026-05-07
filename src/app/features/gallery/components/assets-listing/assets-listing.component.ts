import { isPlatformServer } from '@angular/common';
import { Component, computed, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule } from '@ngx-translate/core';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { ViewportService } from '../../../../core/services/viewport.service';
import { AssetCardSkeletonComponent } from '../../../../shared/components/asset-card-skeleton/asset-card-skeleton.component';
import { FiltersComponent } from '../../../../shared/components/filters/filters.component';
import { StateMessageComponent } from '../../../../shared/components/state-message/state-message.component';
import { getPublisherId } from '../../../../shared/utils/publisherhost.util';
import { Asset } from '../../models/assets.model';
import { AssetsService } from '../../services/assets.service';
import { AssetCardComponent } from '../asset-card/asset-card.component';

@Component({
  selector: 'app-assets-listing',
  imports: [
    FiltersComponent,
    AssetCardComponent,
    AssetCardSkeletonComponent,
    StateMessageComponent,
    TranslateModule,
    NzPaginationModule,
  ],
  templateUrl: './assets-listing.component.html',
  styleUrl: './assets-listing.component.less',
})
export class AssetsListingComponent {
  private readonly assetsService = inject(AssetsService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly viewportService = inject(ViewportService);
  private readonly destroyRef = inject(DestroyRef);

  isServer = isPlatformServer(this.platformId);
  publisherId = getPublisherId();

  assets = signal<Asset[]>([]);
  loading = signal<boolean>(false);
  errorState = signal<boolean>(false);
  categoriesSelection = signal<string[]>([]);
  searchQuery = signal<string>('');
  licensesSelection = signal<string[]>([]);

  readonly page = signal(1);
  readonly pageSize = signal(12);
  readonly total = signal(0);
  readonly pageSizeOptions: number[] = [12, 24, 48];

  hasActiveFilters = computed(
    () =>
      this.searchQuery().trim().length > 0 ||
      this.categoriesSelection().length > 0 ||
      this.licensesSelection().length > 0
  );

  constructor() {
    this.getAssets();
  }

  getSkeletonArray() {
    if (this.isServer) {
      return [];
    }
    const count = this.viewportService.isMobile() ? 4 : 8;
    return Array.from({ length: count });
  }

  getAssets() {
    this.loading.set(true);
    this.errorState.set(false);
    this.assetsService
      .getAssets(
        this.categoriesSelection(),
        this.searchQuery(),
        this.licensesSelection(),
        this.publisherId,
        this.page(),
        this.pageSize()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.assets.set(response.results);
          this.total.set(response.count ?? response.results.length);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorState.set(true);
          this.assets.set([]);
          this.total.set(0);
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
}
