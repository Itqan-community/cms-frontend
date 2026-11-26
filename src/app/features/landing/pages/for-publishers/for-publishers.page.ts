import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map, startWith } from 'rxjs';
import { FeatureShowcaseComponent } from '../../components/feature-showcase/feature-showcase.component';
import { JoinFormComponent } from '../../components/join-form/join-form.component';
import { CONTACT_EMAIL } from '../../data/cli';
import { LANDING_STATS, formatStatsDate } from '../../data/landing-stats';
import { useLandingSeo } from '../../landing-seo';
import { OCTAGON_POINTS } from '../../octagon';
import { ClipboardWriter } from '../../services/clipboard-writer';

const PILLARS = ['PUBLISH', 'CONTROL', 'REACH', 'PROVE'] as const;

/** `/for-publishers`: what Fanar does for a publisher, their journey, and the contact form. */
@Component({
  selector: 'app-for-publishers-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe, FeatureShowcaseComponent, JoinFormComponent],
  styleUrls: ['./for-publishers.page.less'],
  templateUrl: './for-publishers.page.html',
})
export class ForPublishersPage {
  private readonly translate = inject(TranslateService);
  private readonly clipboard = inject(ClipboardWriter);

  readonly octagon = OCTAGON_POINTS;
  readonly email = CONTACT_EMAIL;
  readonly stats = LANDING_STATS;
  readonly pillars = PILLARS.map((key, i) => ({ key, id: key.toLowerCase(), n: i + 1 }));
  readonly channels = [
    { key: 'SITE', on: true },
    { key: 'GALLERY', on: true },
    { key: 'API', on: true },
    { key: 'CLI', on: false },
  ];
  readonly problems = ['1', '2', '3'];
  readonly items = ['1', '2', '3', '4'];
  readonly journey = ['1', '2', '3', '4', '5'];
  readonly joinSteps = ['1', '2', '3'];
  readonly emailCopied = signal(false);

  private readonly lang = toSignal(
    this.translate.onLangChange.pipe(
      map((e) => e.lang),
      startWith(this.translate.currentLang || 'ar')
    ),
    { requireSync: true }
  );
  readonly asOf = computed(() => formatStatsDate(this.stats.asOf, this.lang()));

  constructor() {
    useLandingSeo('LANDING.PUB', '/for-publishers');
  }

  async copyEmail(): Promise<void> {
    if (await this.clipboard.write(this.email)) {
      this.emailCopied.set(true);
      setTimeout(() => this.emailCopied.set(false), 2000);
    }
  }
}
