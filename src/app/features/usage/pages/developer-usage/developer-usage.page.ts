import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { UsageDashboardComponent } from '../../components/usage-dashboard/usage-dashboard.component';

/** Account → API usage: traffic of the signed-in developer's apps (one app per API key). */
@Component({
  selector: 'app-developer-usage-page',
  standalone: true,
  imports: [RouterLink, TranslateModule, UsageDashboardComponent],
  template: `
    <div class="developer-usage">
      <a routerLink="/account/api-keys" class="developer-usage__back">{{
        'USAGE.DEVELOPER.BACK_TO_KEYS' | translate
      }}</a>
      <h1 class="developer-usage__title">{{ 'USAGE.DEVELOPER.TITLE' | translate }}</h1>
      <p class="developer-usage__subtitle">{{ 'USAGE.DEVELOPER.SUBTITLE' | translate }}</p>
      <app-usage-dashboard scope="developer" />
    </div>
  `,
  styles: `
    .developer-usage {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px 16px;
    }
    .developer-usage__title {
      margin: 12px 0 4px;
      font-size: 22px;
      font-weight: 600;
    }
    .developer-usage__subtitle {
      margin: 0 0 16px;
      color: var(--color-neutral-400);
    }
  `,
})
export class DeveloperUsagePage {}
