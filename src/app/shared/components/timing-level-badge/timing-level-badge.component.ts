import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

/** Finest timing a recitation has, from the API's `timing_level`. Only `ayah` is sent today. */
export type TimingLevel = 'ayah' | 'word' | 'sentence';

/**
 * "Timed per ayah / word / sentence" for a recitation.
 *
 * Renders nothing without a level: untimed recitations and other categories get no pill.
 */
@Component({
  selector: 'app-timing-level-badge',
  standalone: true,
  imports: [NzTagModule, NzToolTipModule, TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (key(); as k) {
      <nz-tag
        class="timing-level-badge"
        nzColor="blue"
        [attr.data-level]="level()"
        nz-tooltip
        [nzTooltipTitle]="'TIMING_LEVEL.' + k + '_TOOLTIP' | translate"
        >{{ 'TIMING_LEVEL.' + k | translate }}</nz-tag
      >
    }
  `,
})
export class TimingLevelBadgeComponent {
  readonly level = input<TimingLevel | null | undefined>(null);

  readonly key = computed(() => this.level()?.toUpperCase() ?? '');
}
