import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map, startWith } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  CodeLine,
  LandingCodeBlockComponent,
  cmd,
  codeLines,
  comment,
  out,
} from '../../components/code-block/code-block.component';
import { FeatureShowcaseComponent } from '../../components/feature-showcase/feature-showcase.component';
import { CLI, PUBLIC_API_URL } from '../../data/cli';
import { LANDING_STATS, formatStatsDate } from '../../data/landing-stats';
import { useLandingSeo } from '../../landing-seo';
import { OCTAGON_POINTS } from '../../octagon';

interface PanelStep {
  /** i18n key under LANDING.DEV.PANELS.<panel>. */
  title: string;
  note?: string;
  code: CodeLine[];
  /** Source code (copied whole) rather than shell commands. */
  snippet?: boolean;
}

interface Panel {
  key: string;
  /** Sub-label: a tool list (not translated) or an i18n key. */
  sub: string;
  subIsKey?: boolean;
  steps: PanelStep[];
}

const PANELS: Panel[] = [
  {
    key: 'NODE',
    sub: 'npm, Vite, Next.js',
    steps: [
      { title: 'S1', code: [cmd(`${CLI.npm}`)] },
      {
        title: 'S2',
        note: 'N2',
        code: [
          comment('# itqan-assets.yaml'),
          out('assets_dir: "public/quran"'),
          cmd(`npx ${CLI.name} add english-translation al-mokhtasar`),
        ],
      },
      {
        title: 'S3',
        snippet: true,
        code: codeLines(
          'const csv = await fetch("/quran/al-mokhtasar/al-mokhtasar-71.csv")',
          '  .then((r) => r.text());'
        ),
      },
    ],
  },
  {
    key: 'FLUTTER',
    sub: 'pub.dev',
    steps: [
      { title: 'S1', code: [cmd(`${CLI.dart}`)] },
      {
        title: 'S2',
        note: 'N2',
        code: [cmd(`${CLI.name} add tafsir-ibn-katheer`), cmd(`${CLI.name} install --flutter`)],
      },
      {
        title: 'S3',
        snippet: true,
        code: [
          out('final csv = await rootBundle.loadString('),
          out("  'assets/tafsir-ibn-katheer/…csv');"),
        ],
      },
    ],
  },
  {
    key: 'PYTHON',
    sub: 'PyPI, pipx, uv',
    steps: [
      { title: 'S1', code: [cmd(`${CLI.pipx}`), comment(`# or: ${CLI.uv}`)] },
      {
        title: 'S2',
        code: [
          cmd(`${CLI.name} browse tafsir`),
          cmd(`${CLI.name} add muyassar-of-ghareeb-al-quran`),
        ],
      },
      {
        title: 'S3',
        snippet: true,
        code: codeLines(
          'import csv',
          'rows = csv.DictReader(open("assets/muyassar-of-ghareeb-al-quran/…csv"))'
        ),
      },
    ],
  },
  {
    key: 'BREW',
    sub: 'Homebrew',
    steps: [
      { title: 'S1', code: [cmd(`${CLI.brew}`)] },
      {
        title: 'S2',
        code: [cmd(`${CLI.name} init`), cmd(`${CLI.name} browse`), cmd(`${CLI.name} install`)],
      },
      { title: 'S3', note: 'N3', code: [cmd(`${CLI.name} login`)] },
    ],
  },
  {
    key: 'API',
    sub: 'LANDING.DEV.PANELS.API.D',
    subIsKey: true,
    steps: [
      {
        title: 'S1',
        note: 'N1',
        code: [comment('# cms.itqan.dev → account → API keys'), cmd('export ITQAN_API_KEY=…')],
      },
      {
        title: 'S2',
        code: [
          cmd('curl -H "X-API-Key: $ITQAN_API_KEY" \\'),
          cmd(`  ${PUBLIC_API_URL}/recitations/`),
        ],
      },
      {
        title: 'S3',
        note: 'N3',
        code: [
          cmd('curl -H "X-API-Key: $ITQAN_API_KEY" \\'),
          cmd(`  ${PUBLIC_API_URL}/recitations/{asset_id}/ayah/2:255/`),
          comment('# { "ayah_key": "2:255", "duration_ms": …,'),
          comment('#   "audio_url": "…?c=your-app" }'),
        ],
      },
    ],
  },
];

/** `/for-developers`: the developer journey (discover, try, integrate, ship, stay updated). */
@Component({
  selector: 'app-for-developers-page',
  standalone: true,
  imports: [RouterLink, TranslatePipe, LandingCodeBlockComponent, FeatureShowcaseComponent],
  styleUrls: ['./for-developers.page.less'],
  templateUrl: './for-developers.page.html',
})
export class ForDevelopersPage {
  private readonly translate = inject(TranslateService);

  readonly octagon = OCTAGON_POINTS;
  readonly stats = LANDING_STATS;
  readonly cli = CLI;
  readonly docsUrl = environment.API_DOCS_URL;
  readonly panels = PANELS;
  readonly tab = signal(0);
  readonly panel = computed(() => PANELS[this.tab()]);
  readonly chips = ['1', '2', '3'];
  readonly ship = ['1', '2', '3', '4'];
  readonly why = ['1', '2', '3', '4', '5', '6'];
  readonly stages = [
    { key: 'DISCOVER', id: 'discover' },
    { key: 'TRY', id: 'try' },
    { key: 'INTEGRATE', id: 'try' },
    { key: 'SHIP', id: 'ship' },
    { key: 'UPDATE', id: 'update' },
  ];
  readonly types = [
    { key: 'RECITATIONS', count: this.stats.recitations, how: 'public API' },
    { key: 'MUSHAFS', count: this.stats.mushafs, how: `${CLI.name} add` },
    { key: 'FONTS', count: this.stats.fonts, how: `${CLI.name} add` },
    { key: 'TAFSIRS', count: this.stats.tafsirs, how: `${CLI.name} add` },
    { key: 'TRANSLATIONS', count: this.stats.translations, how: `${CLI.name} add --language` },
  ];

  readonly heroCode = codeLines(
    `$ ${CLI.brew}`,
    `$ ${CLI.name} add al-mokhtasar --language en`,
    'Added to itqan-assets.yaml: al-mokhtasar',
    '  * al-mokhtasar [1.1.0]: downloaded',
    'Updated lockfile at itqan-assets.lock',
    'Success! 1 asset(s) materialized successfully.',
    '$ git add itqan-assets.* && git commit'
  );
  readonly ciCode = codeLines(
    '# .github/workflows/build.yml',
    'steps:',
    '  - uses: actions/checkout@v4',
    `  - uses: ${CLI.action}`,
    `  - run: ${CLI.name} install`,
    '    env:',
    '      ITQAN_API_KEY: ${{ secrets.ITQAN_API_KEY }}'
  );
  readonly updateCode = [
    cmd(`$ ${CLI.name} outdated`),
    comment('  al-mokhtasar   1.0.0 → In range 1.1.0 · Latest 2.0.0'),
    cmd(`$ ${CLI.name} autoupdate`),
    comment('  wrote .github/workflows/update-itqan-assets.yml'),
    comment('  every Monday at 06:00 UTC'),
    cmd(`$ ${CLI.name} install --force`),
  ];

  private readonly lang = toSignal(
    this.translate.onLangChange.pipe(
      map((e) => e.lang),
      startWith(this.translate.currentLang || 'ar')
    ),
    { requireSync: true }
  );
  readonly asOf = computed(() => formatStatsDate(this.stats.asOf, this.lang()));

  constructor() {
    useLandingSeo('LANDING.DEV', '/for-developers');
  }

  pick(i: number): void {
    this.tab.set(i);
  }

  /** Arrow keys move between the stack tabs (WAI-ARIA tabs pattern). */
  onTabKey(event: KeyboardEvent, list: HTMLElement): void {
    const forward = document.documentElement.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight';
    const back = forward === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft';
    if (event.key !== forward && event.key !== back) return;
    event.preventDefault();
    const next = (this.tab() + (event.key === forward ? 1 : -1) + PANELS.length) % PANELS.length;
    this.tab.set(next);
    list.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }
}
