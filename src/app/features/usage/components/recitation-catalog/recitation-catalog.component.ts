import {
  Component,
  DestroyRef,
  OnChanges,
  SimpleChanges,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { Observable, Subscription } from 'rxjs';
import {
  UsageBreakdown,
  UsageFilters,
  UsageRecitationCoverage,
  UsageScope,
  UsageSearchTerms,
} from '../../models/usage.models';
import { surahLabel } from '../../../admin/models/quran-metadata';
import { UsageApiService } from '../../services/usage-api.service';
import { formatChange, formatCompact, presetRange } from '../../utils/usage-filters.util';
import { usageLang } from '../../utils/usage-lang';

interface Loadable<T> {
  loading: boolean;
  error: boolean;
  data: T | null;
}

const idle = <T>(): Loadable<T> => ({ loading: true, error: false, data: null });

/**
 * Publisher-level recitation sections: this week's top or rising recitations, what visitors
 * search the gallery for, and recitations that are still missing surahs.
 */
@Component({
  selector: 'app-recitation-catalog',
  standalone: true,
  imports: [FormsModule, NzSegmentedModule, TranslateModule],
  templateUrl: './recitation-catalog.component.html',
  styleUrl: './recitation-catalog.component.less',
})
export class RecitationCatalogComponent implements OnChanges {
  readonly scope = input.required<Exclude<UsageScope, 'developer'>>();
  readonly filters = input.required<UsageFilters>();

  private readonly api = inject(UsageApiService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly running = new Map<string, Subscription>();
  readonly lang = usageLang();

  readonly order = signal<'value' | 'growth'>('value');
  readonly zeroResults = signal(false);
  readonly week = signal<Loadable<UsageBreakdown>>(idle());
  readonly searches = signal<Loadable<UsageSearchTerms>>(idle());
  readonly coverage = signal<Loadable<UsageRecitationCoverage>>(idle());

  readonly orderOptions = computed(() => {
    this.lang(); // re-translate when the language changes
    return [
      { label: this.t('USAGE.RECITATION.TOP'), value: 'value' },
      { label: this.t('USAGE.RECITATION.RISING'), value: 'growth' },
    ];
  });

  readonly searchOptions = computed(() => {
    this.lang();
    return [
      { label: this.t('USAGE.RECITATION.SEARCH_TOP'), value: 'top' },
      { label: this.t('USAGE.RECITATION.SEARCH_ZERO'), value: 'zero' },
    ];
  });

  readonly weekRows = computed(() => {
    const lang = this.lang();
    return (this.week().data?.items ?? []).map((item, index) => {
      const value = typeof item.value === 'number' ? item.value : null;
      const change =
        value !== null && item.previous ? (value - item.previous) / item.previous : null;
      return {
        rank: index + 1,
        label: item.label ?? item.key,
        value: formatCompact(item.value, lang),
        previous: formatCompact(item.previous ?? 0, lang),
        change: formatChange(change, lang),
      };
    });
  });

  readonly searchRows = computed(() => {
    const lang = this.lang();
    const percent = new Intl.NumberFormat(lang === 'ar' ? 'ar' : 'en', {
      style: 'percent',
      maximumFractionDigits: 0,
    });
    return (this.searches().data?.items ?? []).map((item) => ({
      term: item.term,
      match: item.match
        ? `${this.t('USAGE.RECITATION.MATCH_TYPES.' + item.match.type)}: ${item.match.label}`
        : null,
      searchers: formatCompact(item.searchers, lang),
      zeroShare: percent.format(item.searches ? item.zero_results / item.searches : 0),
    }));
  });

  readonly coverageRows = computed(() => {
    const lang = this.lang();
    const percent = new Intl.NumberFormat(lang === 'ar' ? 'ar' : 'en', {
      style: 'percent',
      maximumFractionDigits: 0,
    });
    const separator = lang === 'ar' ? '، ' : ', ';
    return (this.coverage().data?.items ?? []).map((item) => ({
      id: item.asset_id,
      name: item.name,
      surahs: this.t('USAGE.RECITATION.COVERAGE', { surahs: item.surahs }),
      missing:
        item.missing_by_demand
          .slice(0, 6)
          .map((surah) => surahLabel(surah, this.lang() === 'ar'))
          .join(separator) + (item.missing_by_demand.length > 6 ? separator + '…' : ''),
      timed: item.timed_share === null ? '—' : percent.format(item.timed_share),
    }));
  });

  readonly t = (key: string, params?: Record<string, unknown>): string =>
    this.translate.instant(key, params) as string;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filters'] || changes['scope']) {
      this.load();
    }
  }

  setOrder(order: 'value' | 'growth'): void {
    this.order.set(order);
    this.loadWeek();
  }

  setSearchView(view: 'top' | 'zero'): void {
    this.zeroResults.set(view === 'zero');
    this.loadSearches();
  }

  load(): void {
    this.loadWeek();
    this.loadSearches();
    const { reciter_id, riwayah_id, publisher_id } = this.filters();
    this.track(
      'coverage',
      this.api.recitationCoverage(this.scope(), {
        reciter_id,
        riwayah_id,
        publisher_id: this.scope() === 'admin' ? publisher_id : null,
        incomplete_only: true,
        limit: 50,
      }),
      (value) => this.coverage.set(value)
    );
  }

  /** Always the last 7 days, whatever range the dashboard shows. */
  private loadWeek(): void {
    this.track(
      'week',
      this.api.breakdown(
        this.scope(),
        { ...this.filters(), ...presetRange('7d'), category: 'recitation' },
        { metric: 'plays', by: 'asset', limit: 10, compare: true, order: this.order() }
      ),
      (value) => this.week.set(value)
    );
  }

  private loadSearches(): void {
    this.track(
      'searches',
      this.api.searchTerms(this.scope(), this.filters(), this.zeroResults()),
      (value) => this.searches.set(value)
    );
  }

  private track<T>(key: string, source: Observable<T>, set: (value: Loadable<T>) => void): void {
    this.running.get(key)?.unsubscribe();
    set({ loading: true, error: false, data: null });
    this.running.set(
      key,
      source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (data) => set({ loading: false, error: false, data }),
        error: () => set({ loading: false, error: true, data: null }),
      })
    );
  }
}
