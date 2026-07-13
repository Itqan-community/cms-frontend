# PROJECT_MAP — Itqan CMS Frontend

> Last updated: 2026-05-14 Generated for AI-assisted development. Provide this doc to any LLM to
> give full project context.

---

## [TECH_STACK]

| Layer        | Technology                                              | Version  |
| ------------ | ------------------------------------------------------- | -------- |
| Framework    | Angular (standalone components)                         | ^20.3.7  |
| Language     | TypeScript                                              | ~5.9.2   |
| UI Library   | NG-ZORRO (Ant Design for Angular)                       | ^20.3.1  |
| Icons        | @ng-icons/lucide                                        | ^32.5.0  |
| i18n         | @ngx-translate/core                                     | ^17.0.0  |
| Styling      | LESS                                                    | ^4.2.0   |
| Auth Backend | django-allauth (headless SPA mode)                      | —        |
| Monitoring   | Sentry                                                  | ^10.47.0 |
| Analytics    | Google Analytics (gtag)                                 | —        |
| Web Vitals   | web-vitals                                              | ^5.1.0   |
| QR Codes     | qrcode                                                  | ^1.5.4   |
| State Mgmt   | RxJS + Angular Signals                                  | ~7.8.0   |
| Testing      | Karma + Jasmine                                         | —        |
| Linting      | ESLint (flat config) + Prettier                         | —        |
| Commit       | Commitlint (conventional commits) + Husky + lint-staged | —        |
| Package Mgr  | npm / pnpm                                              | —        |
| Deployment   | Netlify                                                 | —        |

---

## [SYSTEM_FLOW]

### High-Level Architecture

```
User Browser
    |
    |-- Angular SPA (standalone components, Signals)
    |       |
    |       |-- Auth Layer (django-allauth headless)
    |       |       POST /auth/* -> Django allauth
    |       |       Token storage: localStorage (sessionToken + JWTs) + cross-tab sync
    |       |
    |       |-- CMS API Layer (HttpClient + interceptors)
    |       |       GET/POST /cms-api/* -> Django REST API
    |       |
    |       |-- Admin Portal Layer
    |               GET/POST /portal/* -> Django admin API
    |
    |-- Sentry (error monitoring)
    |-- Google Analytics (usage tracking)
    |-- Netlify (hosting, CD, edge redirects)
```

### Authentication Flow (django-allauth headless SPA)

```
1. APP_INITIALIZER fires AuthService.bootstrapOnce() without awaiting (public pages paint immediately).
2. Hydrate: if sessionToken + localStorage.user exist, set provisional currentUser (incl. permissions)
   so admin guards can allow access without unauthorized flash (authReady = provisional OR bootstrapDone).
3. Background validate: GET app `/auth/session` (token if present); if not established, GET browser
   `/auth/session` (credentials). Parallel GET `/config`. On success merge GET `/auth/profile/`
   permissions; on profile failure keep cached permissions. Invalid session with provisional cache
   → clear + login + SESSION_EXPIRED when applicable. `storage` event syncs login/logout across tabs.
4. Public routes never wait; authGuard / portalAccessGuard / permissionGuard wait on authReady.
5. Login: POST /auth/login -> session_token (+ optional JWTs). Interceptor attaches X-Session-Token
   (localStorage first; else readable `sessionid` cookie). Exception: omit on anonymous WebAuthn signup.
6. 401 recovery: if was logged in → recheck then SESSION_EXPIRED login; if anonymous/stale →
   clearStaleClientSession (+ retry public CMS GETs without token). No login redirect for guests.
7. OAuth: OauthCallback runs bootstrapSessionAfterOAuthRedirect (browser session then app session).
```

### Content Access Flow (Gallery)

```
1. Gallery page: GET /cms-api/assets/?category=&search=&license_code=
2. Asset detail: GET /cms-api/assets/{id}/  (includes is_open_access, access_status)
3. Download click (logged in):
   - access_status null -> open access path (license then download)
   - not_requested -> access request modal
   - pending -> blocked; show waiting state (no modal, no download)
   - approved -> license then download
   - rejected -> blocked; friendly contact Itqan message
   (not logged in -> redirect to login)
4. Access request: POST /cms-api/assets/{id}/request-access/ when access_status is not_requested
   -> refetch GET /cms-api/assets/{id}/ and branch on new access_status
   (approved -> license/download; pending -> waiting UI; rejected -> contact message)
5. License confirmation (first time per user only):
   - if localStorage has global acceptance for current user id -> skip modal
   - else scroll-to-confirm modal; on confirm persist `gallery-license-accepted:{userId}` in localStorage
6. Download: GET /cms-api/assets/{id}/download/ -> redirect to file
7. Report issue: modal on asset detail -> POST /portal/issue-reports/ `{ asset_id, description }`
   (login required; reporter from session; no portal permission gate on gallery CTA)
```

Portal assets (recitations, tafsirs, translations) expose `is_open_access` and
`restricted_for_tenant` on create/update (POST/PATCH) and in list/detail responses. List filter:
`is_open_access=true|false`. `restricted_for_tenant=true` assets are excluded from public CMS
listings by the backend.

### Admin CRUD Flow (all entities follow same pattern)

```
List  -> GET    /portal/{entity}/
Detail -> GET   /portal/{entity}/{id}/
Create -> POST  /portal/{entity}/
Update -> PUT   /portal/{entity}/{id}/
Delete -> DELETE /portal/{entity}/{id}/

Each entity has: ListComponent, FormComponent (create+edit), DetailComponent
Base class: AdminListBase (src/app/features/admin/utils/admin-list-base.ts)
```

---

## [ARCHITECTURE]

### Directory Tree (Simplified)

```
cms-frontend/
├── public/                          # Static assets (served at root)
│   ├── assets/                      # images/, icons/, data/ (Quran JSON)
│   └── i18n/                        # en.json, ar.json (~1370 keys each)
├── src/
│   ├── index.html                   # Root HTML (Arabic RTL default, Inter font)
│   ├── main.ts                      # Angular bootstrap + Sentry init
│   ├── styles.less                  # Global utilities (sr-only, card, flex)
│   ├── theme.less                   # CSS vars + NG-ZORRO component overrides
│   ├── environments/                # 5 env configs (default/prod/staging/local/publisher)
│   └── app/
│       ├── app.ts                   # Root component (i18n init, lang switch, header)
│       ├── app.html                 # <app-header /> + <router-outlet>
│       ├── app.config.ts            # All providers (HTTP interceptors, auth bootstrap, i18n, Sentry)
│       ├── app.routes.ts            # Complete route table
│       ├── core/                    # Auth, interceptors, guards, constants, enums, services
│       ├── features/                # 7 feature modules (admin, gallery, publishers, etc.)
│       ├── shared/                  # 16 reusable components + 2 utils
│       └── icons/                   # Lucide icon registry (67 icons)
├── angular.json                     # Build config (4 environments, LESS, assets)
├── netlify.toml                     # Deploy config + security headers
├── tsconfig.json / .app / .spec     # TypeScript config (strict, ES2022)
├── eslint.config.js                 # Flat ESLint config
└── .commitlintrc.json, .husky/      # Git hooks (commit-msg, pre-commit, pre-push)
```

### Core Layer (`src/app/core/`)

| Subdirectory     | Contents                                                                                                                       | Purpose                                                           |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `auth/`          | 21 pages + 1 service + 3 guards + headless API module (20+ files)                                                              | Full django-allauth headless SPA integration                      |
| `auth/headless/` | `HeadlessAuthApiService` (~60 methods), `HeadlessAppTokenService`, types, hooks, WebAuthn utils, CSRF utils, provider redirect | allauth headless contract implementation                          |
| `constants/`     | `BREAKPOINTS`, `NAV_LINKS`                                                                                                     | Responsive breakpoints + navigation link definitions              |
| `enums/`         | `Categories` (tafsir/translation/recitation), `Licenses` (CC0-CC-BY-NC-ND + colors)                                            | Content categorization and licensing                              |
| `guards/`        | `publisherHostGuard`                                                                                                           | Blocks publisher subdomain visitors from CMS routes               |
| `interceptors/`  | 6 interceptors (credentials, CSRF response, app-session-token, headers/global, auth-error, error)                              | HTTP pipeline: session token, CSRF, error handling, Sentry        |
| `sentry/`        | chunk-load recovery, `beforeSend` noise filter, app ErrorHandler wrapper                                                       | Benign network/chunk failures: one-time reload + drop from Sentry |
| `services/`      | `GoogleAnalyticsService`, `WebVitalsService`, `ViewportService`                                                                | Analytics, Core Web Vitals, responsive viewport detection         |
| `utils/`         | `csrf.util.ts`                                                                                                                 | Django CSRF (same-origin cookies + cross-origin override)         |

### Interceptor Pipeline (order matters)

```
Request: credentialsInterceptor -> csrfResponseInterceptor
         -> appSessionTokenInterceptor (X-Session-Token only) -> headersInterceptor (CSRF + Accept-Language)
Response: authErrorInterceptor -> errorInterceptor
```

`409` + `unverified_email` on `/auth/app/v1/*`: no global error toast, no Sentry; pages redirect to
`/account/verify-email?reason=unverified_email` (login/register/security settings) with copy on
verify-email.

HTTP `status === 0` (network abort / offline): suppressed from Sentry in `authErrorInterceptor`;
user toast still via `error.interceptor` (`ERRORS.NETWORK_ERROR`).

### Sentry (noise + recovery)

- Init: `main.ts` — `beforeSend` drops chunk/module-import failures and status-0 HTTP noise
  (`core/sentry/sentry-before-send.util.ts`).
- ErrorHandler: `createAppSentryErrorHandler()` — one-time `location.reload()` on lazy chunk /
  module-import failure (`sessionStorage` flag), then delegates to Sentry.
- Successful bootstrap clears the chunk-recovery flag so a later deploy mismatch can recover once.

### Auth Architecture (django-allauth headless SPA)

```
AllauthAuthChangeBus (event bus)
       |
HeadlessAuthApiService (HTTP client for /auth/*)
       |
AuthService (orchestrator + state management via Signals)
       |
  |---------|---------|---------|
Pages   Guards    Interceptors   Utils
(22)   (3)       (6)           (route-query, CSRF)
```

**Token management:**

- `session_token` / continuity: resolved via `HeadlessAppTokenService.getSessionToken()` — prefer
  localStorage (`sessionToken`, shared across tabs); if empty, readable `sessionid` cookie → copied
  into localStorage on read; one-time migration from legacy `sessionStorage`
- `access_token` + `refresh_token` -> localStorage (JWT for CMS API)
- `csrftoken` cookie (same-origin) OR in-memory override (cross-origin)
- `AuthService` CMS API helpers: `GET/POST/PATCH/DELETE` `API_BASE_URL/api-keys/…` with the same
  `X-Session-Token`/CSRF interceptor stack; used by **`/account/api-keys`** (developer key UI).

**Auth pages (lazy-loaded under `/account/*`):** Login, Register, ForgotPassword, ResetPassword,
ChangePassword, ChangeEmail, Logout, LoginByCode (2-step), MFA (TOTP/WebAuthn/RecoveryCodes),
Reauthenticate (3 modes), VerifyEmail, ProviderSignup, Passkey (3 modes), OAuthCallback,
ManageProviders, SecuritySettings (TOTP / recovery codes: GET may omit plaintext; one-time POST
merge + redacted UX), Sessions, ApiKeys (`/account/api-keys`: list/create/rename/revoke/delete),
Trust, Profile, CompleteProfile

**Auth guards:** `authGuard` (requires auth), `guestGuard` (blocks authenticated users),
`profileCompletedGuard` (requires completed profile)

### Route Map

| Path                     | Component                      | Guards                           | Notes                                                                                                                                      |
| ------------------------ | ------------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `/gallery`               | `GalleryPage`                  | —                                | Main listing                                                                                                                               |
| `/gallery/asset/:id`     | `AssetDetailsPage`             | —                                | Detail + access request + download + report issue modal                                                                                    |
| `/publishers`            | `PublishersPage`               | `publisherHostGuard`             | Stub                                                                                                                                       |
| `/publisher/:id`         | `PublisherDetailsPage`         | `publisherHostGuard`             | Detail + filtered assets                                                                                                                   |
| `/license/:id`           | `LicenseDetailsPage`           | —                                | License detail                                                                                                                             |
| `/content-standards`     | `UsageStandardsPage`           | `publisherHostGuard`             | Content guidelines                                                                                                                         |
| `/unauthorized`          | `UnauthorizedPage`             | —                                | Card UX; CTA + 5s countdown auto-redirect to `/gallery`; `hideHeader`; dir name typo `unautorized/`                                        |
| `/complete-profile`      | `CompleteProfilePage`          | `authGuard`                      | Profile completion                                                                                                                         |
| `/account/*`             | (22 auth pages)                | guestGuard/authGuard             | Auth & account management                                                                                                                  |
| `/admin`                 | `AdminLayoutComponent`         | `authGuard`, `portalAccessGuard` | Permission-based admin shell                                                                                                               |
| `/admin` (default)       | `AdminPortalRedirectComponent` | —                                | Redirects to first allowed module (`publishers` for Itqan admin, else by read permission)                                                  |
| `/admin/publishers`      | (lazy routes)                  | `itqanAdminGuard`                | Publisher CRUD (staff)                                                                                                                     |
| `/admin/tafsirs`         | (lazy routes)                  | per-route `permissionGuard`      | Tafsir CRUD                                                                                                                                |
| `/admin/translations`    | (lazy routes)                  | per-route `permissionGuard`      | Translation CRUD                                                                                                                           |
| `/admin/recitations`     | (lazy routes)                  | per-route `permissionGuard`      | Recitation CRUD                                                                                                                            |
| `/admin/reciters`        | (lazy routes)                  | per-route `permissionGuard`      | Reciter CRUD                                                                                                                               |
| `/admin/issues`          | (lazy routes)                  | _(permission guards commented)_  | Issue reports (list/detail/create/edit/delete); TODO enable `portal_*_issue_report` guards                                                 |
| `/admin/members`         | (lazy routes)                  | `membersAccessGuard`             | Publisher member list/invite/edit/remove/resend via `/portal/members/` (modal UX on single list)                                           |
| `/admin/access-requests` | (lazy routes)                  | `accessRequestsAccessGuard`      | Asset access requests list/accept/reject + settings via `/portal/access-requests/` and `/portal/publishers/{id}/access-requests-settings/` |
| `/admin/usage`           | (lazy routes)                  | `portal_access`                  | API usage analytics                                                                                                                        |
| `**`                     | redirect -> /gallery           | —                                | Wildcard                                                                                                                                   |

---

## [FEATURES]

### 1. Gallery (`src/app/features/gallery/`)

**Purpose:** Browse, search, filter, and download Quranic assets.

| File                                                    | Type       | Purpose                                                        |
| ------------------------------------------------------- | ---------- | -------------------------------------------------------------- |
| `models/assets.model.ts`                                | Interfaces | `ApiAssets`, `Asset`, `AssetDetails`                           |
| `services/assets.service.ts`                            | Service    | `getAssets(filters)`, `getAssetDetails(id)`                    |
| `pages/gallery/gallery.page.ts`                         | Page       | Wrapper title + `<app-assets-listing/>`                        |
| `pages/asset-details/asset-details.page.ts`             | Page       | Full detail + access request modal + license modal + download  |
| `components/assets-listing/assets-listing.component.ts` | Component  | Filter state + grid + skeleton + empty state                   |
| `components/asset-card/asset-card.component.ts`         | Component  | Single asset card (icon, license, name, desc, publisher, link) |

**States:** loading (skeleton), empty (no results with/without filters), error, not-found (404),
success.

### 2. Publishers (`src/app/features/publishers/`)

**Purpose:** Publisher profiles and their asset listings.

| File                                                | Type    | Purpose                                               |
| --------------------------------------------------- | ------- | ----------------------------------------------------- |
| `services/publisher.service.ts`                     | Service | `getPublisher(id)`, `getPublisherAssets(id, filters)` |
| `pages/publishers/publishers.page.ts`               | Page    | Stub (placeholder for publisher directory)            |
| `pages/publisher-details/publisher-details.page.ts` | Page    | Publisher info + filtered asset grid                  |

### 3. Admin (`src/app/features/admin/`)

**Purpose:** Full CRUD management portal for all Quranic content entities.

**Layout:** `AdminLayoutComponent` (shell with admin styling, hideHeader, fullWidth)

**Modules (each follows identical CRUD pattern):**

| Module             | Entity                | Key Models                          | Notes                                                                                                                                                                            |
| ------------------ | --------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `publishers/`      | Publisher admin       | `Publisher`                         | CRUD + image upload                                                                                                                                                              |
| `tafsirs/`         | Tafsir (exegesis)     | `Tafsir`, `TafsirVersion`           | CRUD + version management                                                                                                                                                        |
| `translations/`    | Translation           | `Translation`, `TranslationVersion` | CRUD + version management                                                                                                                                                        |
| `recitations/`     | Recitation (audio)    | `Recitation`                        | CRUD + track upload with progress + timings; full bulk upload success redirects to `/gallery/asset/{id}`; partial failure clears validate banner and keeps failed rows for retry |
| `reciters/`        | Reciter               | `Reciter`                           | CRUD + image upload + death info                                                                                                                                                 |
| `issues/`          | Issue reports         | `IssueReportOut`                    | List/filter/detail CRUD via `/portal/issue-reports/`; route/UI guards pending backend permissions                                                                                |
| `members/`         | Publisher members     | `MemberOut`                         | List/invite/update/remove/resend via `/portal/members/`; scoped by `AdminTenantService.selectedPublisherId()`                                                                    |
| `access-requests/` | Asset access requests | `AccessRequestOut`                  | List/accept/reject + publisher settings (`/portal/publishers/{id}/access-requests-settings/`); detail drawer; permission-gated actions                                           |
| `mushafs/`         | Mushaf (Quran pages)  | Pages, Surahs, Ayahs, Words         | Complex nested UI with tabs and search                                                                                                                                           |
| `usage/`           | API Usage analytics   | Request logs                        | Charts, top endpoints, top entities                                                                                                                                              |
| `audio/`           | Audio management      | —                                   | Routes defined                                                                                                                                                                   |
| `software/`        | Software management   | —                                   | Routes defined                                                                                                                                                                   |

**Shared admin components:**

- `admin-column-picker/` — Column visibility toggles for tables
- `asset-versions-manager/` — Version CRUD (tafsir/translation)
- `coming-soon/` — Shared placeholder card; optional route `data.icon`; CTA + 5s countdown to
  `/gallery`
- `search-panel/` — Search UI
- `section-layout/` — Reusable section wrapper

**Services:**

- `admin-auth.service.ts` — `AdminAuthService`: exposes `currentUser`, role signals (`isAdmin`,
  `isItqanAdmin`, `isPublisherAdmin`), and `hasPermission` / `hasAnyPermission` /
  `hasAllPermissions` based on normalized profile permission codes. Constants:
  `features/admin/constants/portal-permission.constants.ts`.
- `admin-table-column-prefs.service.ts` — Persists column visibility per table
- `admin-table-sort-prefs.service.ts` — Persists sort preferences
- `asset-versions.service.ts` — Version management API
- `quran-data.service.ts` — Quran metadata (pages, surahs, ayahs)

**Guards:** `admin.guard.ts` (legacy `is_admin` gate), `itqan-admin.guard.ts`,
`publisher-admin.guard.ts`, `portal-access.guard.ts` (`portal_access`), `permission.guard.ts`
(factory for route-level permission checks). Wired on `/admin` and lazy admin feature routes.

**Pipes:** `admin-country-label.pipe.ts`, `admin-hijri-year.pipe.ts` **Base class:** `AdminListBase`
— shared list page logic (loading, data fetching, error handling) **Utility:**
`display-localization.util.ts` — bilingual field display

### 4. Content Standards (`src/app/features/content-standards/`)

**Purpose:** Static documentation page for Quranic content usage standards (verse, word, tafsir).

| File                          | Type     | Purpose                   |
| ----------------------------- | -------- | ------------------------- |
| `content-standards.page.ts`   | Page     | Documentation content     |
| `content-standards.page.html` | Template | (view file for content)   |
| `content-standards.page.less` | Styles   | RTL documentation styling |

### 5. License (`src/app/features/license/`)

**Purpose:** License detail pages (routed at `/license/:id`).

| File                 | Type | Purpose                     |
| -------------------- | ---- | --------------------------- |
| `LicenseDetailsPage` | Page | License information display |

### 6. Error (`src/app/features/error/`)

**Purpose:** Error/status pages.

| File                 | Type | Purpose  | Status                                                |
| -------------------- | ---- | -------- | ----------------------------------------------------- |
| `pages/not-found/`   | Page | 404 page | **Stub** (empty template)                             |
| `pages/unautorized/` | Page | 401 page | **Stub** (empty template, note: directory misspelled) |

### 7. Dashify (`src/app/features/dashify/`)

**Purpose:** Unknown — minimal implementation, likely a stub/placeholder.

---

## [SHARED LAYER] (`src/app/shared/`)

### Components (16 total, all standalone)

| Component                      | Selector                    | Purpose                                                           |
| ------------------------------ | --------------------------- | ----------------------------------------------------------------- |
| `AssetCardSkeletonComponent`   | `app-asset-card-skeleton`   | Loading placeholder for asset cards                               |
| `AssetDetailSkeletonComponent` | `app-asset-detail-skeleton` | Loading placeholder for detail page                               |
| `BreadcrumbComponent`          | `app-breadcrumb`            | Auto-generated breadcrumbs from URL                               |
| `EmptyPlaceholderComponent`    | `app-empty-placeholder`     | "Coming soon" empty state                                         |
| `FiltersComponent`             | `app-filters`               | Search + category + license filters (responsive drawer on mobile) |
| `HeaderComponent`              | `app-header`                | Main sticky header (logo, nav, lang switch, user actions)         |
| `ImageCarouselComponent`       | `app-image-carousel`        | Image carousel (nz-carousel with fade effect)                     |
| `LangSwitchComponent`          | `app-lang-switch`           | Language toggle (ar/en)                                           |
| `LicenseTagComponent`          | `app-license-tag`           | CC license badge (color-coded, popover/mobile drawer)             |
| `MobileMenuComponent`          | `app-mobile-menu`           | Slide-out mobile drawer with nav + lang + user                    |
| `NavigationMenuComponent`      | `app-navigation-menu`       | Desktop horizontal nav bar                                        |
| `RecitationCardComponent`      | `app-recitation-card`       | Recitation card for admin                                         |
| `StatCardComponent`            | `app-stat-card`             | Metrics card (icon + number + label)                              |
| `StateMessageComponent`        | `app-state-message`         | Reusable empty/error status with actions                          |
| `UserActionsComponent`         | `app-user-actions`          | Login button / avatar + logout                                    |
| `UserAvatarComponent`          | `app-user-avatar`           | Avatar with image or initial fallback                             |

### Utils

| File                          | Exports                                                                                                                                              | Purpose                                                        |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `error.utils.ts`              | `parseRetryAfterSeconds`, `isIncorrectCodeError`, `isWebAuthnIncorrectCodeError`, `getErrorMessage`, `joinAllauthErrors`, `extractAllauthErrorItems` | Auth error parsing utilities                                   |
| `auth-error-resolver.util.ts` | `resolveAuthErrorMessage`, `isMessageLocalizedForUi`                                                                                                 | Auth UI errors: code→i18n map, localized backend msg, fallback |
| `publisherhost.util.ts`       | `getPublisher()`, `getPublisherId()`, `isPublisherHost()`                                                                                            | Multi-tenant publisher domain detection                        |

### Directives (empty directory — placeholder for future use)

---

## [ENVIRONMENTS]

| Env                   | File                       | production | API_BASE_URL                    | OAuth    | Sentry |
| --------------------- | -------------------------- | ---------- | ------------------------------- | -------- | ------ |
| Default (staging dev) | `environment.ts`           | false      | `staging.api.cms.itqan.dev`     | disabled | —      |
| Production            | `environment.prod.ts`      | true       | `api.cms.itqan.dev`             | enabled  | ✓      |
| Staging               | `environment.staging.ts`   | false      | dynamic (same-origin detection) | enabled  | ✓      |
| Local                 | `environment.local.ts`     | false      | `127.0.0.1:8000`                | enabled  | —      |
| Publisher             | `environment.publisher.ts` | false      | `staging.api.cms.itqan.dev`     | enabled  | —      |

**Key env vars:** `API_BASE_URL`, `ADMIN_API_BASE_URL`, `API_DOCS_URL`, `gaTrackingId`, `sentryDsn`,
`oauthBrowserRedirectEnabled`, `webauthnReplaceRpIdWithHostname`

---

## [i18n]

- **Library:** @ngx-translate/core (HTTP loader, JSON files at `/i18n/{lang}.json`)
- **Languages:** English (`en`), Arabic (`ar`)
- **Default:** Arabic (`ar`) — set in both `index.html` and `app.config.ts`
- **Persistence:** `localStorage.getItem('lang')`
- **Bootstrap:** `initializeAppTranslations()` retries once; on final failure boots anyway (no
  unhandled ErrorHandler) so flaky mobile loads of `/i18n/*.json` do not crash the app
- **Switch:** Full page reload on language toggle (`LangSwitchComponent`); `App.switchLang` catches
  failed `translate.use`
- **RTL:** `<html dir="rtl">` with logical CSS properties (`margin-inline`, `padding-inline`)
- **Keys:** 1483 per language (parity verified); domains include auth, navigation, gallery, admin,
  content standards, licenses, errors, forms, access-request license terms
- **API errors:** Hybrid resolver in `shared/utils/api-error-resolver.util.ts` — maps `error_name` /
  known codes to i18n, shows backend `message` when language matches UI, else fallback key; global
  `error.interceptor.ts` uses it; component-level handlers dedupe via
  `shouldSuppressGlobalErrorToast`
- **Auth errors:** `shared/utils/auth-error-resolver.util.ts` (django-allauth code catalog)
- **Backend handoff:** Portal validate-upload `message`, timing upload `file_errors[]`, and generic
  error `message` fields should localize via `Accept-Language` (sent by `global.interceptor.ts`)

---

## [API ENDPOINTS]

### Auth (django-allauth headless)

`/{auth/session, auth/login, auth/signup, auth/logout, auth/password/*, account/email/*, account/authenticators/*, ...}`

### CMS API (`/cms-api/`)

- `GET /assets/` — List assets (paginated, filterable)
- `GET /assets/{id}/` — Asset detail
- `POST /assets/{id}/request-access/` — Request access to asset
- `GET /assets/{id}/download/` — Get download URL
- `GET /resources/{id}/download/` — Download resource directly
- `GET /publishers/{id}/` — Publisher detail

### Admin Portal (`/portal/`)

Full CRUD for: publishers, tafsirs (versions), translations (versions), recitations (with tracks),
reciters, issue reports (`/portal/issue-reports/`), publisher members (`/portal/members/`), asset
access requests (`/portal/access-requests/` — list, detail, accept, reject;
`/portal/publishers/{id}/access-requests-settings/` — auto-acceptance), mushafs
(pages/surahs/ayahs/words), usage analytics

---

## [DEPLOYMENT]

| Platform         | Netlify                                                                                                       |
| ---------------- | ------------------------------------------------------------------------------------------------------------- | -------------------- |
| Production       | `https://cms.itqan.dev` (master branch)                                                                       |
| Staging          | `https://staging.cms.itqan.dev` (staging branch)                                                              |
| Build cmd        | `npm run build:{env}`                                                                                         |
| Publish dir      | `dist/browser`                                                                                                |
| SPA fallback     | Deploy `netlify/production                                                                                    | staging/\_redirects` |
| Security headers | X-Frame-Options: DENY, X-Content-Type-Options: nosniff, X-XSS-Protection, Referrer-Policy, Permissions-Policy |
| Cache            | Static assets under `/assets/` — 1 year immutable                                                             |

---

## [ORPHANS & PENDING]

| Item                                    | Status            | Notes                                                                                                               |
| --------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| `features/error/pages/unautorized/`     | Partial           | `UnauthorizedPage`: full UX + countdown redirect (directory spelling still misses `h`). `not-found` page unchanged. |
| `features/publishers/pages/publishers/` | Stub              | Publishers directory listing page is empty.                                                                         |
| `features/dashify/`                     | Unknown           | Minimal implementation, purpose unclear.                                                                            |
| `features/admin/` guards                | Implemented       | `portal-access`, `permission`, `itqan-admin` guards active on admin routes.                                         |
| `shared/directives/`                    | Empty             | Directory exists with no files.                                                                                     |
| `features/admin/mushafs/`               | In progress       | Complex UI with multiple tabs (Pages, Surahs, Ayahs, Words) — may be incomplete.                                    |
| `features/admin/audio/`                 | Partial           | Routes defined but implementation details need verification.                                                        |
| `features/admin/software/`              | Partial           | Routes defined but implementation details need verification.                                                        |
| Sentry `tracesSampleRate`               | Staging overrides | 1.0 (100%) in staging — may be too high for non-production.                                                         |
| WebAuthn RP ID                          | Development mode  | `webauthnReplaceRpIdWithHostname` env flag allows RP ID patching in dev.                                            |

---

## [KEY PATTERNS & CONVENTIONS]

1. **Standalone components** — No NgModules, every component is `standalone: true`
2. **Signal-based state** — `signal()`, `computed()`, `input()`, `output()` for reactive state
3. **async/await + firstValueFrom** — API calls use `firstValueFrom(this.http.get(...))` in async
   methods
4. **DestroyRef + takeUntilDestroyed** — Automatic cleanup of subscriptions
5. **Consistent naming** — `.page.ts` for routed pages, `.component.ts` for reusable components,
   `.service.ts` for services
6. **Feature folder structure** — `models/`, `services/`, `pages/`, `components/` per feature
7. **Admin module structure** — `routes.ts`, `-layout.component.ts`, `components/`, `models/`,
   `services/`, `utils/` per entity
8. **i18n first** — All user-facing strings use `translate` pipe or `TranslateService`
9. **CSS variables** — Theming via `--color-*`, `--radius-*`, `--shadow-*` custom properties
10. **RTL support** — Logical CSS properties throughout, `ltr-flip`/`rtl-flip` transform utilities
11. **Responsive** — Mobile-first with breakpoints at 480/576/768/992/1200/1600px
12. **Error classification** — `resolveAuthErrorMessage()` for auth pages (code map → localized
    backend → i18n fallback); `getErrorMessage()` for low-level allauth envelope parsing
