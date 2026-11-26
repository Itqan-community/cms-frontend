import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import {
  USAGE_URL_KEYS,
  UsageDashboardComponent,
} from '../../../../usage/components/usage-dashboard/usage-dashboard.component';
import { UsageLeaderboardComponent } from '../../../../usage/components/usage-leaderboard/usage-leaderboard.component';
import { UsageUnseenTrafficComponent } from '../../../../usage/components/usage-unseen-traffic/usage-unseen-traffic.component';
import { UsageFilters, UsageRange, UsageScope } from '../../../../usage/models/usage.models';
import {
  resolveGranularity,
  usageStateFromParams,
} from '../../../../usage/utils/usage-filters.util';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { PublisherFilterItem } from '../../../text-assets/models/text-assets.models';
import { PublishersFilterService } from '../../../text-assets/services/publishers-filter.service';

/** The page's tabs, in order; the URL names the open one in `tab` (none for the Dashboard). */
const TABS = ['dashboard', 'recitations', 'text', 'leaderboard', 'unseen'] as const;
type UsageTab = (typeof TABS)[number];
const STAFF_TABS: ReadonlySet<UsageTab> = new Set(['leaderboard', 'unseen']);
/** URL keys every tab shares; the others belong to the open tab and reset when it changes. */
const SHARED_KEYS = new Set(['range', 'start', 'end', 'granularity']);

/**
 * Admin → Usage: the usage dashboard for the publisher in the request. Itqan staff also get a
 * publisher picker, the leaderboard and unseen traffic.
 */
@Component({
  selector: 'app-usage-page',
  standalone: true,
  imports: [
    FormsModule,
    NzSelectModule,
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
  private readonly publishersFilterService = inject(PublishersFilterService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly queryParams = toSignal(this.route.queryParamMap);

  readonly isStaff = computed(() => this.adminAuth.isStaff());
  readonly scope = computed<UsageScope>(() => (this.isStaff() ? 'admin' : 'publisher'));
  readonly publishers = signal<PublisherFilterItem[]>([]);

  /** The tabs this user sees. */
  readonly tabs = computed<UsageTab[]>(() =>
    TABS.filter((tab) => this.isStaff() || !STAFF_TABS.has(tab))
  );
  /** The tab the URL names; unknown and staff-only tabs (for publishers) fall back to the Dashboard. */
  readonly tab = computed<UsageTab>(() => {
    const tab = this.queryParams()?.get('tab') as UsageTab;
    return this.tabs().includes(tab) ? tab : 'dashboard';
  });
  readonly tabIndex = computed(() => this.tabs().indexOf(this.tab()));

  /** Staff only: the publisher the reports cover, kept in the URL (`publisher`). */
  readonly selectedPublisherId = computed<number | null>(() => {
    const id = Number(this.queryParams()?.get('publisher'));
    return this.isStaff() && Number.isInteger(id) && id > 0 ? id : null;
  });

  /** The date range every tab shows, kept in the URL by the dashboards. */
  readonly range = computed<UsageRange>(() => {
    const params = this.queryParams();
    const raw: Record<string, string> = {};
    for (const key of params?.keys ?? []) {
      raw[key] = params?.get(key) ?? '';
    }
    const { preset, filters, granularity } = usageStateFromParams(raw);
    return { preset, start_date: filters.start_date, end_date: filters.end_date, granularity };
  });

  /** The dashboard's bucket size, for the unseen-traffic chart (which has no hourly buckets). */
  readonly seriesGranularity = computed(() => {
    const { start_date, end_date, granularity } = this.range();
    const resolved = resolveGranularity(granularity, start_date, end_date);
    return resolved === 'hour' ? 'day' : resolved;
  });

  /** Same range as the dashboard, for the leaderboard and unseen traffic. */
  readonly filters = computed<UsageFilters>(() => {
    const { start_date, end_date } = this.range();
    return { start_date, end_date, publisher_id: this.selectedPublisherId() };
  });

  ngOnInit(): void {
    if (this.isStaff()) {
      this.publishersFilterService
        .search('', 1)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (res) => this.publishers.set(res.results) });
    }
  }

  onPublisherChange(publisherId: number | null): void {
    this.navigate({ publisher: publisherId });
  }

  /** Opens a tab, keeping the shared date range and dropping the previous tab's view. */
  onTabChange(index: number): void {
    const tab = this.tabs()[index];
    if (!tab || tab === this.tab()) {
      return;
    }
    const queryParams: Record<string, string | null> = Object.fromEntries(
      USAGE_URL_KEYS.filter((key) => !SHARED_KEYS.has(key)).map((key) => [key, null])
    );
    queryParams['tab'] = tab === 'dashboard' ? null : tab;
    this.navigate(queryParams);
  }

  private navigate(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
