import { Component, DestroyRef, HostListener, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PublisherAddComponent } from './components/publisher-add/publisher-add.component';
import { PublisherFiltersComponent } from './components/publisher-filters/publisher-filters.component';
import { PublisherListComponent } from './components/publisher-list/publisher-list.component';
import { PublishersBannerComponent } from './components/publishers-banner/publishers-banner.component';
import { PublishersStatsCardsComponent } from './components/publishers-stats-cards/publishers-stats-cards.component';
import { Publisher } from './models/publishers-stats.models';
import { PublishersService } from './services/publishers.service';

@Component({
  selector: 'app-publishers',
  standalone: true,
  imports: [
    PublishersBannerComponent,
    PublishersStatsCardsComponent,
    PublisherFiltersComponent,
    PublisherListComponent,
    PublisherAddComponent,
  ],
  template: `
    <div class="publishers-page">
      <app-publishers-banner></app-publishers-banner>
      <app-publishers-stats-cards></app-publishers-stats-cards>

      <div class="action-bar">
        @if (!isAdding) {
          <app-publisher-filters
            (searchChanged)="onSearch($event)"
            (filterChanged)="onFilterChange($event)"
          ></app-publisher-filters>
        }

        <app-publisher-add
          [(isAdding)]="isAdding"
          (publisherAdded)="onPublisherAdded()"
        ></app-publisher-add>
      </div>

      @if (!isAdding) {
        <app-publisher-list
          [publishers]="publishers"
          [loading]="loading"
          [hasMore]="hasMore"
        ></app-publisher-list>
      }
    </div>
  `,
  styles: [
    `
      .publishers-page {
        display: flex;
        flex-direction: column;
      }
      .action-bar {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 24px;
        gap: 16px;
      }
      app-publisher-filters {
        flex: 1;
      }
      @media (max-width: 768px) {
        .action-bar {
          flex-direction: column;
          align-items: stretch;
        }
      }
    `,
  ],
})
export class PublishersComponent implements OnInit {
  private readonly publishersService = inject(PublishersService);
  private readonly destroyRef = inject(DestroyRef);

  publishers: Publisher[] = [];
  page = 1;
  limit = 20;
  searchTerm = '';
  activeFilter: boolean | null = null;
  loading = false;
  hasMore = true;
  isAdding = false;

  ngOnInit(): void {
    this.loadPublishers();
  }

  loadPublishers(): void {
    if (this.loading || !this.hasMore) return;

    this.loading = true;
    this.publishersService
      .getPublishers({
        page: this.page,
        limit: this.limit,
        search: this.searchTerm,
        is_active: this.activeFilter ?? undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.publishers = [...this.publishers, ...data];
          this.hasMore = data.length === this.limit;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  onSearch(term: string): void {
    this.searchTerm = term;
    this.page = 1;
    this.publishers = [];
    this.hasMore = true;
    this.loadPublishers();
  }

  onFilterChange(value: boolean | null): void {
    this.activeFilter = value;
    this.page = 1;
    this.publishers = [];
    this.hasMore = true;
    this.loadPublishers();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (this.isAdding) return;

    const pos =
      (document.documentElement.scrollTop || document.body.scrollTop) +
      document.documentElement.offsetHeight;
    const max = document.documentElement.scrollHeight;

    // Load more when 200px from bottom
    if (pos >= max - 200) {
      this.onScroll();
    }
  }

  onScroll(): void {
    if (this.loading || !this.hasMore) return;
    this.page++;
    this.loadPublishers();
  }

  onPublisherAdded(): void {
    this.page = 1;
    this.publishers = [];
    this.hasMore = true;
    this.isAdding = false;
    this.loadPublishers();
  }
}
