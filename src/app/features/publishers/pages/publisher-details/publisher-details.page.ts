import { isPlatformServer } from '@angular/common';
import { Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
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
  ],
  templateUrl: './publisher-details.page.html',
  styleUrl: './publisher-details.page.less',
})
export class PublisherDetailsPage implements OnInit {
  private readonly publisherService = inject(PublisherService);
  private readonly route = inject(ActivatedRoute);

  private readonly platformId = inject(PLATFORM_ID);

  isServer = isPlatformServer(this.platformId);

  readonly id = this.route.snapshot.params['id'];
  publisher = signal<Publisher | null>(null);
  assets = signal<Asset[]>([]);
  publisherLoading = signal<boolean>(true);
  assetsLoading = signal<boolean>(true);

  categoriesSelection = signal<string[]>([]);
  searchQuery = signal<string>('');
  licensesSelection = signal<string[]>([]);

  ngOnInit() {
    this.getPublisherDetails();
    this.getAssets();
  }

  getSkeletonArray() {
    if (this.isServer) {
      return [];
    }
    const count = window.innerWidth < 768 ? 4 : 8;
    return Array.from({ length: count });
  }

  getPublisherDetails() {
    this.publisherLoading.set(true);
    this.publisherService.getPublisher(this.id).subscribe({
      next: (publisher) => this.publisher.set(publisher),
      complete: () => this.publisherLoading.set(false),
      error: () => this.publisherLoading.set(false),
    });
  }

  getAssets() {
    this.assetsLoading.set(true);
    this.publisherService
      .getPublisherAssets(
        this.id,
        this.categoriesSelection(),
        this.searchQuery(),
        this.licensesSelection()
      )
      .subscribe({
        next: (response) => this.assets.set(response.results),
        complete: () => this.assetsLoading.set(false),
        error: () => this.assetsLoading.set(false),
      });
  }

  searchQueryChange(event: string) {
    this.searchQuery.set(event);
    this.getAssets();
  }

  categoriesSelectionChange(event: string[]) {
    this.categoriesSelection.set(event);
    this.getAssets();
  }

  licensesSelectionChange(event: string[]) {
    this.licensesSelection.set(event);
    this.getAssets();
  }

  getPublisherIconUrl(): string {
    const publisher = this.publisher();
    return publisher?.icon_url || '';
  }
}
