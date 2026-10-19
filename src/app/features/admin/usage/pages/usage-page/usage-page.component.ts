import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { UsageDashboardComponent } from '../../../../usage/components/usage-dashboard/usage-dashboard.component';
import { UsageLeaderboardComponent } from '../../../../usage/components/usage-leaderboard/usage-leaderboard.component';
import { UsageUnseenTrafficComponent } from '../../../../usage/components/usage-unseen-traffic/usage-unseen-traffic.component';
import { UsageFilters, UsageScope } from '../../../../usage/models/usage.models';
import { usageStateFromParams } from '../../../../usage/utils/usage-filters.util';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { PublisherFilterItem } from '../../../tafsirs/models/tafsirs.models';
import { PublishersFilterService } from '../../../tafsirs/services/publishers-filter.service';
import { UsageService } from '../../services/usage.service';

/**
 * Admin → Usage: the usage dashboard for the publisher in the request. Itqan admins also get a
 * publisher picker, the leaderboard and unseen traffic. The Mixpanel board stays as "Legacy
 * board" until the usage-reports cutover.
 */
@Component({
  selector: 'app-usage-page',
  standalone: true,
  imports: [
    FormsModule,
    NzAlertModule,
    NzEmptyModule,
    NzSelectModule,
    NzSpinModule,
    NzTabsModule,
    TranslateModule,
    UsageDashboardComponent,
    UsageLeaderboardComponent,
    UsageUnseenTrafficComponent,
  ],
  templateUrl: './usage-page.component.html',
  styleUrl: './usage-page.component.less',
})
export class UsagePageComponent implements OnInit {
  private readonly adminAuth = inject(AdminAuthService);
  private readonly usageService = inject(UsageService);
  private readonly publishersFilterService = inject(PublishersFilterService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly queryParams = toSignal(this.route.queryParamMap);

  readonly isItqanAdmin = computed(() => this.adminAuth.isItqanAdmin());
  readonly scope = computed<UsageScope>(() => (this.isItqanAdmin() ? 'admin' : 'publisher'));
  readonly publishers = signal<PublisherFilterItem[]>([]);
  readonly selectedPublisherId = signal<number | null>(null);

  /** Same range as the dashboard (kept in the URL), for the leaderboard and unseen traffic. */
  readonly filters = computed<UsageFilters>(() => {
    const params = this.queryParams();
    const raw: Record<string, string> = {};
    for (const key of params?.keys ?? []) {
      raw[key] = params?.get(key) ?? '';
    }
    const { start_date, end_date } = usageStateFromParams(raw).filters;
    return { start_date, end_date, publisher_id: this.selectedPublisherId() };
  });

  readonly boardLoading = signal(false);
  readonly boardError = signal(false);
  readonly boardUrl = signal<SafeResourceUrl | null>(null);
  private boardRequested = false;

  ngOnInit(): void {
    if (this.isItqanAdmin()) {
      this.publishersFilterService
        .search('', 1)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (res) => this.publishers.set(res.results) });
    }
  }

  onPublisherChange(publisherId: number | null): void {
    this.selectedPublisherId.set(publisherId);
    if (this.boardRequested) {
      this.loadBoardUrl();
    }
  }

  onTabChange(index: number, legacyIndex: number): void {
    if (index === legacyIndex && !this.boardRequested) {
      this.boardRequested = true;
      this.loadBoardUrl();
    }
  }

  private loadBoardUrl(): void {
    this.boardLoading.set(true);
    this.boardError.set(false);
    this.boardUrl.set(null);
    this.usageService
      .getBoardUrl(this.selectedPublisherId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ board_url }) => {
          this.boardLoading.set(false);
          if (board_url) {
            this.boardUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(board_url));
          } else {
            this.boardError.set(true);
          }
        },
        error: () => {
          this.boardLoading.set(false);
          this.boardError.set(true);
        },
      });
  }
}
