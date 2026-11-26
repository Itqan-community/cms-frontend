import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

export type JourneyStage = 'discover' | 'try';

const STAGES = [
  { key: 'DISCOVER', fragment: 'discover', stage: 'discover' },
  { key: 'TRY', fragment: 'try', stage: 'try' },
  { key: 'INTEGRATE', fragment: 'try', stage: 'try' },
  { key: 'SHIP', fragment: 'ship', stage: null },
  { key: 'UPDATE', fragment: 'update', stage: null },
] as const;

/**
 * The developer journey strip from the B9 mockups (Discover › Try › Integrate › Ship › Stay
 * updated), shown on the gallery so browsing reads as one step of it. Each step links to its part
 * of the developer page.
 */
@Component({
  selector: 'app-developer-journey',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  styleUrls: ['./developer-journey.component.less'],
  template: `
    <nav class="journey" [attr.aria-label]="'LANDING.DEV.STAGES_LABEL' | translate">
      <ol class="journey__list">
        @for (s of stages; track s.key; let last = $last) {
          <li class="journey__item" [class.journey__item--current]="s.stage === current()">
            <a
              class="journey__link"
              routerLink="/for-developers"
              [fragment]="s.fragment"
              [attr.aria-current]="s.stage === current() ? 'step' : null"
            >
              {{ 'LANDING.DEV.STAGES.' + s.key | translate }}
            </a>
            @if (!last) {
              <span class="journey__sep" aria-hidden="true">›</span>
            }
          </li>
        }
      </ol>
    </nav>
  `,
})
export class DeveloperJourneyComponent {
  readonly current = input.required<JourneyStage>();
  readonly stages = STAGES;
}
