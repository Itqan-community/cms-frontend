import { Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import type { TimingCoverage } from '../../models/recitations.models';

/** Ayah-timing coverage of a recitation, quality or track: full / partial (with %) / none. */
@Component({
  selector: 'app-timing-coverage-tag',
  standalone: true,
  imports: [NzTagModule, NzToolTipModule, TranslateModule],
  template: `
    @let c = coverage();
    <nz-tag
      class="timing-coverage-tag"
      [attr.data-status]="c.timing_status"
      [nzColor]="color()"
      nz-tooltip
      [nzTooltipTitle]="
        c.ayahs_count
          ? ('ADMIN.RECITATIONS.TIMINGS.STATUS.TOOLTIP'
            | translate: { timed: c.timed_ayahs_count, total: c.ayahs_count })
          : ('ADMIN.RECITATIONS.TIMINGS.STATUS.NO_TRACKS' | translate)
      "
    >
      @switch (c.timing_status) {
        @case ('full') {
          {{ 'ADMIN.RECITATIONS.TIMINGS.STATUS.FULL' | translate }}
        }
        @case ('partial') {
          {{ 'ADMIN.RECITATIONS.TIMINGS.STATUS.PARTIAL' | translate: { percent: percent() } }}
        }
        @default {
          {{ 'ADMIN.RECITATIONS.TIMINGS.STATUS.NONE' | translate }}
        }
      }
    </nz-tag>
  `,
})
export class TimingCoverageTagComponent {
  readonly coverage = input.required<TimingCoverage>();

  readonly color = computed(() => {
    switch (this.coverage().timing_status) {
      case 'full':
        return 'green';
      case 'partial':
        return 'orange';
      default:
        return 'default';
    }
  });

  /** Floored so a partial recitation never reads 100%, and at least 1% once anything is timed. */
  readonly percent = computed(() => {
    const { timed_ayahs_count: timed, ayahs_count: total } = this.coverage();
    if (!total) return 0;
    return Math.min(99, Math.max(1, Math.floor((timed / total) * 100)));
  });
}
