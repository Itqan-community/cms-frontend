# Usage Reports — Plan 4: Frontend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [x]`) syntax for tracking.

**Goal:** Usage dashboards on the four surfaces of the usage-reports spec: the publisher portal
(with Itqan-admin extras), a usage section on each asset's admin page, the public gallery counts
line, and the developer's API-usage page. Also show and edit the public app slug on the API keys
page.

**Architecture:** A new `features/usage/` domain holds everything shared: the API service (one
method per report, with a `scope` argument), the models, pure ECharts option builders and filter
helpers (all unit-tested), a chart wrapper (loading / empty / error / view-as-table), and one
configurable `UsageDashboardComponent` used by the admin page, the asset sections and the developer
page. ECharts is tree-shaken (line, bar, pie, heatmap) and loaded lazily by the chart wrapper, so
only usage screens download it.

**Tech stack:** Angular 20 standalone + signals, NG-ZORRO, `echarts@6.1.0`, `ngx-echarts@20.0.2`
(22.x needs Angular 22), ngx-translate, Karma + Jasmine.

**Spec:** backend repo `docs/superpowers/specs/2026-10-18-usage-reports-design.md` §10, with the
plan-3 API (§9 + §20) as the contract (backend PR Itqan-community/cms-backend#557).

## Global constraints

- Repo rules (`AGENTS.md`): smallest code that works, TDD for each verifiable goal, no TODOs, update
  `PROJECT_MAP.md`, lint clean (`npm run lint`, `--max-warnings=0`).
- Type-check with `npx tsc --noEmit -p tsconfig.app.json` (`npm run type-check` checks nothing).
- `npx prettier --check .` before pushing (covers Markdown).
- Every user-facing string in `public/i18n/en.json` and `ar.json` (`npm run check:i18n`).
- RTL: charts mirror (inverse time axis, y-axis on the right, right-aligned legend) in Arabic.
- Specs that render a component importing `NzModalModule` stub `NzModalService` with
  `overrideProvider`.

## Rulings

1. **Usage section, not a tab, on asset admin pages.** The detail pages have no tab set; a "Usage"
   section below the versions manager keeps the pages unchanged otherwise.
2. **No world map yet.** A map needs a world GeoJSON bundle (hundreds of KB) and the map chart.
   Countries are shown as a ranked bar chart + table; the map goes to the backlog.
3. **No dark theme.** The app has no dark mode; the chart palette is a fixed list built from the
   theme's primary/secondary tokens (ECharts draws on canvas and cannot read CSS variables).
4. **Admin page tabs:** Dashboard for everyone with `portal_read_usage`; Itqan admins also get a
   publisher picker, _Leaderboard_ and _Unseen traffic_; the Mixpanel iframe becomes _Legacy board_
   until cutover.
5. **Developer page** lives at `/account/usage`, linked from the API keys page. Its app filter lists
   the apps returned by `breakdown?by=app` (plan-3 ruling 10).
6. **Gallery line** calls `GET /cms-api/assets/{id}/usage-counts/` and renders only on 200; a 404
   (flag off) renders nothing and is not reported as an error.
7. **Disclaimers** come from the API (`summary.disclaimers`, already localized by
   `Accept-Language`), so the backend stays the source of truth.
8. **Hour-of-week** requests use the viewer's time zone (`Intl.DateTimeFormat().resolvedOptions()`).

## Interfaces

```ts
// features/usage/models/usage.models.ts
type UsageScope = 'publisher' | 'admin' | 'developer';
interface UsageFilters { start_date: string; end_date: string; asset_id?: number; category?: string;
  channel?: string; platform?: string; country?: string; app?: number; publisher_id?: number }
interface UsageSummary { metrics: Record<UsageMetric, MetricValue>; integrating_apps: MetricValue;
  unidentified_apps: boolean; latest_version_share: number | null; uniques_basis: string;
  definitions: Record<string, string>; disclaimers: { code: string; text: string }[];
  data_updated_at: string | null; ... }

// features/usage/services/usage-api.service.ts
summary(scope, filters): Observable<UsageSummary>
timeseries(scope, filters, { metric, granularity, split_by?, top?, compare? }): Observable<UsageTimeseries>
breakdown(scope, filters, { metric, by, limit?, tz? }): Observable<UsageBreakdown>
leaderboard(filters, { metric, by, limit }) / reconciliation(filters) / exportCsv(scope, filters)
publicCounts(assetId): Observable<PublicUsageCounts | null>   // null on 404

// features/usage/utils/usage-chart-options.ts (pure)
buildTrendOptions(series, { rtl, labels, granularity }): EChartsCoreOption
buildDonutOptions(items, { rtl }) / buildBarOptions(items, { rtl, horizontal })
buildHourOfWeekOptions(items, { rtl, dayLabels })

// features/usage/utils/usage-filters.util.ts (pure)
presetRange(preset, today): { start_date, end_date }
filtersFromParams(params) / filtersToParams(filters)
formatCompact(value, lang) / formatChange(change)
```

## Review focus

1. Arabic: every chart mirrors, numbers use Arabic locale, every string is translated.
2. ECharts is not in the main bundle (lazy chunk only on usage screens).
3. Filter state survives reload (URL query params) and back/forward.
4. `"<3"` values (developer privacy floor) render as text and never break a chart.
5. A 404 from public counts never shows an error toast.

---

### Task 1: Dependencies and ECharts setup

- [x] `npm install echarts@6.1.0 ngx-echarts@20.0.2`; `features/usage/echarts-setup.ts` registers
      LineChart, BarChart, PieChart, HeatmapChart, grid/tooltip/legend/visualMap/dataZoom components
      and the canvas renderer; provided with `provideEchartsCore({ echarts: () => import(...) })`.
- [x] Commit `build(usage): add echarts and ngx-echarts`.

### Task 2: Models, API service and filter helpers

- [x] Failing specs: `usage-api.service.spec.ts` (URLs per scope, query params, 404 → `null` for
      public counts, CSV as blob), `usage-filters.util.spec.ts` (presets, URL round trip, compact
      numbers in `ar`/`en`, change formatting).
- [x] Implement; specs pass. Commit
      `feat(usage): add the usage reports API service and filter helpers`.

### Task 3: Chart option builders and the chart wrapper

- [x] Failing specs: trend (zero series, RTL inverse axis + right y-axis, `__other__` label), donut,
      bar (`"<3"` rendered as 0-height with the text label), hour-of-week (168 cells, day labels);
      chart wrapper shows loading, empty, error and table modes.
- [x] Implement; commit `feat(usage): add chart option builders and the usage chart component`.

### Task 4: Usage dashboard component

- [x] Failing specs: loads summary/timeseries/breakdowns for the scope; headline cards with %
      change; metric switcher reloads the trend; URL query params drive filters; Export CSV calls
      the export endpoint; footer shows `data_updated_at` and the disclaimers; error state.
- [x] Implement; commit `feat(usage): add the usage dashboard`.

### Task 5: Admin usage page (publisher + Itqan admin)

- [x] Failing specs: publisher sees only Dashboard; Itqan admin sees publisher picker, Leaderboard,
      Unseen traffic and Legacy board tabs.
- [x] Route guard `portal_read_usage`; commit
      `feat(usage): replace the admin usage page with usage dashboards`.

### Task 6: Asset usage sections

- [x] Failing spec: section picks metrics per category (recitation: plays/listeners, surahs, hour of
      week; text categories: downloads + installs, versions, languages; others: downloads +
      installs, platforms).
- [x] Add to font, mushaf, tafsir, translation and recitation detail pages; commit
      `feat(usage): show usage on asset admin pages`.

### Task 7: Gallery counts line

- [x] Failing spec: renders "plays · downloads · apps" on 200, nothing on 404.
- [x] Commit `feat(gallery): show public usage counts on asset pages`.

### Task 8: Developer usage page and app slug on API keys

- [x] Failing specs: `/account/usage` loads the developer scope; API keys list shows the slug and
      saves an edited slug (`PATCH app_slug`), showing `invalid_app_slug` / `app_slug_taken`.
- [x] Commits `feat(account): add the developer usage page` and
      `feat(account): show and edit the app slug of API keys`.

### Task 9: i18n, PROJECT_MAP, verification

- [x] `npm run check:i18n`, `npx tsc --noEmit -p tsconfig.app.json`, `npm run lint`,
      `npx prettier --check .`, `ng test --watch=false`, `npm run build:staging` (check the echarts
      chunk is lazy). `PROJECT_MAP.md` updated. Commit
      `docs(usage): map the usage     reports frontend`.
