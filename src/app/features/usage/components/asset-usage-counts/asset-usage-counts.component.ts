import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { PublicUsageCounts } from '../../models/usage.models';
import { UsageApiService } from '../../services/usage-api.service';
import { formatCompact } from '../../utils/usage-filters.util';

/**
 * Gallery asset page: "plays · downloads · apps". Rendered only when the backend serves the
 * counts (`PUBLIC_USAGE_COUNTS_ENABLED`); a 404 or any error shows nothing.
 */
@Component({
  selector: 'app-asset-usage-counts',
  standalone: true,
  imports: [TranslateModule],
  template: `
    @if (counts(); as value) {
      <p class="asset-usage-counts" [attr.title]="disclaimer()">
        @if (value.plays) {
          <span>{{ format(value.plays) }} {{ 'USAGE.PUBLIC.PLAYS' | translate }}</span>
        }
        @if (value.downloads) {
          <span>{{ format(value.downloads) }} {{ 'USAGE.PUBLIC.DOWNLOADS' | translate }}</span>
        }
        @if (value.apps) {
          <span>{{ format(value.apps) }} {{ 'USAGE.PUBLIC.APPS' | translate }}</span>
        }
      </p>
    }
  `,
  styles: `
    .asset-usage-counts {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 12px;
      margin: 4px 0 0;
      font-size: 13px;
      color: var(--color-neutral-400);
    }
    .asset-usage-counts span + span::before {
      content: '·';
      margin-inline-end: 12px;
    }
  `,
})
export class AssetUsageCountsComponent implements OnInit {
  readonly assetId = input.required<number>();

  private readonly api = inject(UsageApiService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly counts = signal<PublicUsageCounts | null>(null);
  readonly disclaimer = computed(
    () =>
      this.counts()
        ?.disclaimers.map((item) => item.text)
        .join(' ') ?? null
  );

  ngOnInit(): void {
    this.api
      .publicCounts(this.assetId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (counts) =>
          this.counts.set(
            counts && (counts.plays || counts.downloads || counts.apps) ? counts : null
          ),
        error: () => this.counts.set(null),
      });
  }

  format(value: number): string {
    return formatCompact(value, this.translate.currentLang || 'ar');
  }
}
