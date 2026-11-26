import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map, startWith } from 'rxjs';
import { CLI } from '../../data/cli';
import { LANDING_STATS, formatStatsDate } from '../../data/landing-stats';
import {
  LandingCodeBlockComponent,
  codeLines,
} from '../../components/code-block/code-block.component';
import { useLandingSeo } from '../../landing-seo';
import { OCTAGON_POINTS } from '../../octagon';

type Persona = 'pub' | 'dev';

/** The site entry (`/`): one message, a "who are you?" toggle, and the counts. */
@Component({
  selector: 'app-entry-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe, LandingCodeBlockComponent],
  styleUrls: ['./entry.page.less'],
  templateUrl: './entry.page.html',
})
export class EntryPage {
  private readonly translate = inject(TranslateService);

  readonly octagon = OCTAGON_POINTS;
  readonly stats = LANDING_STATS;
  readonly persona = signal<Persona>('pub');
  readonly steps = ['1', '2', '3', '4'];
  readonly devCode = codeLines(
    `$ ${CLI.brew}`,
    `$ ${CLI.name} add al-mokhtasar --language en`,
    'Updated lockfile at itqan-assets.lock',
    'Success! 1 asset(s) materialized successfully.'
  );

  private readonly lang = toSignal(
    this.translate.onLangChange.pipe(
      map((e) => e.lang),
      startWith(this.translate.currentLang || 'ar')
    ),
    { requireSync: true }
  );
  readonly asOf = computed(() => formatStatsDate(this.stats.asOf, this.lang()));
  readonly prefix = computed(() => `LANDING.ENTRY.${this.persona() === 'pub' ? 'PUB' : 'DEV'}`);

  constructor() {
    useLandingSeo('LANDING.ENTRY', '/');
  }

  pick(persona: Persona): void {
    this.persona.set(persona);
  }
}
