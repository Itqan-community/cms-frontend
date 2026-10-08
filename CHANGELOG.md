# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-16

Release 1.0.0. See commit history for full details.

---

## [1.0.1] - 2026-06-17

Release 1.0.1. See commit history for full details.

---

## [1.0.2] - 2026-06-17

Release 1.0.2.

## Changes

- fix(ci): auto-format package.json after npm version bump to prevent prettier failures
- fix(ci): include commits in fallback release notes when Gemini API unavailable

---

## [1.0.3] - 2026-06-17

Release 1.0.3.

## Changes

- fix(ci): register sentry production deployment after release

---

## [1.0.4] - 2026-06-17

Release 1.0.4.

## Changes

- fix(ci): correct sentry deploys new syntax for v2 cli

---

## [1.0.5] - 2026-06-17

Release 1.0.5.

## Changes

- fix(release): verify gemini ai release notes generation

---

## [1.1.0] - 2026-06-18

Release 1.1.0.

## Changes

- feat(assets): update access requests management contract
- fix(members): route invitation accept page on staging
- feat(access-requests): add management portal
- fix: typo
- fix: lint issues
- feat(members): add invitation acceptance page
- feat(members): update permissions
- feat: publisher members management
- feat(auth): redesign login/signup pages

---

## [1.1.1] - 2026-06-21

Release 1.1.1.

## Changes

- fix(deps): remove stale pnpm-lock.yaml so Netlify uses npm

---

## [1.1.2] - 2026-06-22

Release 1.1.2.

## Changes

- fix(admin): always submit reciter forms as multipart
- fix(admin): reintroduce granular permissions for publisher management

---

## [1.1.3] - 2026-06-22

Release 1.1.3.

## Changes

- fix(admin): send only changed reciter fields on patch

---

## [1.1.4] - 2026-06-22

Release 1.1.4.

## Changes

- fix(auth): restore passkey stage tokens and fix CI test hang
- fix(auth): block sessionid cookie fallback after logout
- fix(admin): redirect single-scope users to publisher detail and enhance permissions
- fix(auth): prevent stale session GET after logout
- fix(auth): clear browser session on logout and before OAuth login

---

## [1.2.0] - 2026-06-22

Release 1.2.0.

## Changes

- fix(admin): route publishers nav to selected tenant detail
- feat(auth): unify guest auth UI and streamline passkey flows
- chore(release): 1.1.4 [skip ci]
- fix(auth): restore passkey stage tokens and fix CI test hang
- fix(auth): block sessionid cookie fallback after logout
- fix(admin): redirect single-scope users to publisher detail and enhance permissions
- fix(auth): prevent stale session GET after logout
- fix(auth): clear browser session on logout and before OAuth login
- chore(release): 1.1.3 [skip ci]
- fix(admin): send only changed reciter fields on patch
- chore(release): 1.1.2 [skip ci]
- fix(admin): always submit reciter forms as multipart
- fix(admin): reintroduce granular permissions for publisher management

---

## [1.3.0] - 2026-07-05

Release 1.3.0.

## Changes

- feat(gallery): add font and program category filters
- chore(release): 1.2.0 [skip ci]
- fix(admin): route publishers nav to selected tenant detail
- feat(auth): unify guest auth UI and streamline passkey flows
- chore(release): 1.1.4 [skip ci]
- fix(auth): restore passkey stage tokens and fix CI test hang
- fix(auth): block sessionid cookie fallback after logout
- fix(admin): redirect single-scope users to publisher detail and enhance permissions
- fix(auth): prevent stale session GET after logout
- fix(auth): clear browser session on logout and before OAuth login
- chore(release): 1.1.3 [skip ci]
- fix(admin): send only changed reciter fields on patch
- chore(release): 1.1.2 [skip ci]
- fix(admin): always submit reciter forms as multipart
- fix(admin): reintroduce granular permissions for publisher management
- chore(release): 1.1.1 [skip ci]
- fix(deps): remove stale pnpm-lock.yaml so Netlify uses npm

---

## [1.3.1] - 2026-07-05

Release 1.3.1.

## Changes

- chore: fix PROJECT_MAP.md prettier formatting for CI
- fix(auth): persist session across tabs for split-host deployments

---

## [1.4.0] - 2026-07-06

Release 1.4.0.

## Changes

- fix(test): replace ESM spyOn with passkey env helpers in auth specs
- fix(ci): restore npm bin-links so CI can resolve prettier and ng
- feat(auth): auto-prompt passkey on login and MFA pages
- chore: disable npm bin-links for NTFS dev environments
- feat(recitations): add gallery and reciter links on detail page
- fix(recitations): redirect to gallery after successful bulk track upload
- fix(i18n): complete localization audit with hybrid API error resolver
- chore: fix PROJECT_MAP.md prettier formatting for CI
- fix(auth): persist session across tabs for split-host deployments
- fix(access-requests): defer auto-accept toggle until backend confirms
- feat(gallery): integrate access_status for asset downloads
- feat(gallery): add font and program category filters
- feat(gallery): persist global license acceptance per user
- feat(assets): add open access and tenant API enrollment toggles
- feat(gallery): add report issue modal on asset details page
- fix(test): provide TranslateService and NzMessageService in AuthService specs
- fix(gallery): align category filters with API asset categories
- fix(i18n): load Arabic translations before app bootstrap
- fix(auth): improve passkey/WebAuthn error handling and messages
- fix(auth): centralize error messages with localized fallbacks
- chore(deps-dev): bump @commitlint/config-conventional
- chore(deps): bump actions/setup-node from 4 to 6
- chore(deps): bump codecov/codecov-action from 3 to 6

---

## [1.4.1] - 2026-07-06

Release 1.4.1.

## Changes

- fix(gallery): stabilize card height and open-access badge
- chore(release): 1.4.0 [skip ci]
- fix(test): replace ESM spyOn with passkey env helpers in auth specs
- fix(ci): restore npm bin-links so CI can resolve prettier and ng
- feat(auth): auto-prompt passkey on login and MFA pages
- chore: disable npm bin-links for NTFS dev environments
- feat(recitations): add gallery and reciter links on detail page
- fix(recitations): redirect to gallery after successful bulk track upload
- fix(i18n): complete localization audit with hybrid API error resolver
- chore: fix PROJECT_MAP.md prettier formatting for CI
- fix(auth): persist session across tabs for split-host deployments
- fix(access-requests): defer auto-accept toggle until backend confirms
- feat(gallery): integrate access_status for asset downloads
- feat(gallery): add font and program category filters
- feat(gallery): persist global license acceptance per user
- feat(assets): add open access and tenant API enrollment toggles
- feat(gallery): add report issue modal on asset details page
- fix(test): provide TranslateService and NzMessageService in AuthService specs
- fix(gallery): align category filters with API asset categories
- fix(i18n): load Arabic translations before app bootstrap
- fix(auth): improve passkey/WebAuthn error handling and messages
- fix(auth): centralize error messages with localized fallbacks
- chore(deps-dev): bump @commitlint/config-conventional
- chore(deps): bump actions/setup-node from 4 to 6
- chore(deps): bump codecov/codecov-action from 3 to 6

---

## [1.4.2] - 2026-07-06

Release 1.4.2.

## Changes

- fix(gallery): keep RTL cards equal width
- chore(release): 1.4.1 [skip ci]
- fix(gallery): stabilize card height and open-access badge

---

## [1.4.3] - 2026-07-06

Release 1.4.3.

## Changes

- fix(auth): keep public browsing anonymous
- chore(release): 1.4.2 [skip ci]
- fix(gallery): keep RTL cards equal width

---

## [1.4.4] - 2026-07-09

Release 1.4.4.

## Changes

- fix(auth): hydrate provisional session to avoid admin reload flash
- Public Gallery Render - Stop blocking public page render on auth session check

---

## [1.5.0] - 2026-07-14

Release 1.5.0.

## Changes

- fix(ci): use admin PAT for semantic-release push to master
- style: fix prettier formatting on publisher-details.page.ts
- fix(seo): key robots.txt on Netlify CONTEXT instead of per-config assets
- fix(seo): address PR review — per-env robots.txt, twitter:card, description fallbacks
- fix(seo): guard publisher-details fetches with takeUntilDestroyed
- feat(seo): add SeoService/JsonLdService and wire SEO tags into public pages
- fix(sentry): recover chunk/i18n network failures and drop status-0 noise

---

## [1.6.0] - 2026-07-22

Release 1.6.0.

## Changes

- feat(reciters): add public reciters SEO pages, API, and sitemap generation

---

## [1.7.0] - 2026-08-10

Release 1.7.0.

## Changes

- style: apply Prettier fixes for format:check
- fix(admin): show member group_name from list API response
- feat(admin): load member groups dynamically and lock asset publisher fields
- feat(admin): make initial asset version optional on create
- docs(README): add roadmap, issue labels, and AI assistant guidelines
- feat(none): empty commit
- feat(none): empty commit
- feat(admin): require initial version on asset create forms
- feat(reciters): add public reciters SEO pages, API, and sitemap generation
- fix(admin): address CodeRabbit feedback for mushafs and fonts
- feat(admin): wire mushafs and fonts to live portal APIs
- style: fix prettier formatting on publisher-details.page.ts
- fix(seo): key robots.txt on Netlify CONTEXT instead of per-config assets
- fix(seo): address PR review — per-env robots.txt, twitter:card, description fallbacks
- feat(admin): add fonts and programs portal CRUD with mock APIs
- feat(admin): add mushafs portal CRUD with mock API
- ci(i18n): fail build when Arabic translations are missing
- fix(seo): guard publisher-details fetches with takeUntilDestroyed
- feat(seo): add SeoService/JsonLdService and wire SEO tags into public pages

---

## [1.8.0] - 2026-08-17

Release 1.8.0.

## Changes

- feat(admin): add recitation folder variants on detail

---

## [1.9.0] - 2026-09-06

Release 1.9.0.

## Changes

- fix(admin): keep Home sidenav active only on /admin
- fix(admin): expose content editor grid ref for template count
- feat(admin): show listing counts in page headings
- fix(recitations): allow folder variant edits regardless of track count
- feat(recitations): enable folder hide/show and set-default actions
- feat(recitations): migrate folder tabs to nz-tabset and default variant rules
- ci: add cloudflare pages config for staging preview
- feat(none): empty commit to trigger deployment
- style: apply Prettier formatting to fix CI format check
- feat(mushaf): hide mushaf reader for now
- feat(mushaf): enhance mushaf reader, enhance asset editor
- feat(admin): enhance content editor with CSV copy/paste, undo/redo, and filtering
- feat(build): empty commit to re-deploy
- feat(build): empty commit to re-deploy
- style: format admin layout files for CI prettier check
- fix: linting
- fix: Linting
- feat(build): empty commit
- feat(build): empty commit
- refactor(recitations): improve code formatting and readability in various files
- feat(recitations): add 'Add' label to admin common section and improve folder switcher styles
- feat: add layout grid icon for /admin route polishing the sidebar tabs
- feat: add all the links as the sideNav with the same permissions
- fix: removing TAB_HOME from the sidebar revirting ADMIN.HOME
- feat(recitations): prevent folder deletion when conditions are not met
- fix(recitations): harden folder tab a11y and folder-switch race conditions
- feat(recitations): add tab-style recitation folder switcher and default selection (fixes #208)
- fix: correct object path handling in JSON update logic
- feat: Admin portal home/landing page (section cards)
- chore: revert unintentional formatting changes to auth and publisher files
- fix: Collabse Side Bar
- fix: add to localization files with English and Arabic translation strings
- feat: extract Content Ops layout and sidebar
- feat: editing part1
- feat(mushaf): infinite-scroll surah view and drop per-ayah navigation
- feat(mushaf): render mushaf as SVG pages from quranpedia CDN
- feat(mushaf): add ayah-by-ayah Quran reader

---

## [1.10.0] - 2026-09-28

Release 1.10.0.

## Changes

- fix(ci): fix prettier formatting and eslint rules for lint-and-test workflow
- fix(admin): address PR #246 code review feedback
- feat(admin): fold long unchanged text in content changes by default
- feat(admin): say language assignment covers tafsirs and translations only
- feat(admin): bring back surah and ayah number columns in the editor
- fix(admin): label the surah template's reference column 'Surah name'
- feat(admin): show review comments in the version list
- feat(admin): gate content editing behind its own permission
- fix(gallery): save downloads under the name the backend gives
- feat(gallery): show each asset's content template
- feat(admin): clarify the version list actions and changes panel
- feat(admin): show content changes in a readable before/after layout
- fix(admin): show the unit count for word assets in the editor title
- fix(admin): make long descriptions optional on asset forms
- fix(admin): create the content grid once its row model is known
- style: apply prettier to asset-templates files
- feat: render review changes by template unit label
- fix(admin): render commit diffs by template unit label
- feat: add template and layout selectors to asset create forms
- feat: show the content template badge on gallery asset cards
- feat: show the content template badge on translation and tafsir assets
- feat: add asset template badge component
- fix: gate cacheBlockSize on the infinite row model
- feat: add infinite row model for word based content editing
- fix: derive content grid template from loaded rows when unbound
- feat: drive content grid columns from the asset template
- feat: add template-shaped content models and mushaf layouts service
- style: apply prettier to files merged from staging
- fix(admin): normalize asset version page size
- fix(admin): address final previewer review comments
- style: apply prettier to members-list component
- fix(admin): address review feedback on the review grid PR
- feat(admin): add language support for asset versions (#240)
- feat(admin): add language assignment for members with permission checks
- fix(admin): enhance review grid UX, language persistence, and tests
- feat(admin): show last-approved to current diff in review grid
- feat(admin): move translation review to a dedicated full-screen page
- feat(admin): surface review grid on asset detail with i18n
- feat(admin): translation review grid component
- feat(admin): review models, service, and permission constant
- fix(admin): clamp asset version page size
- fix(admin): address universal asset previewer review feedback
- fix(admin): remove unrelated save error reload
- fix(admin): address asset previewer review feedback
- feat(admin): add commit functionality with change review support
- fix(auth): reject protocol-relative redirect targets in readNextQueryParam
- fix(admin): address asset previewer review feedback
- feat(admin): add universal asset previewer
- chore: restore environment configuration
- fix(auth): preserve redirect after login
- feat(admin): add file upload for seeding new languages and version restoration
- feat(admin): add language support for asset versions
- fix(admin): harden multilingual content editor against data loss
- fix(admin): standardize CSV column headers in asset grid (surah/ayah)
- feat(admin): add language management to content editor
- feat(content-editor): remove footnotes from editable fields and update related hints
- feat(admin): handle "no_changes_to_publish" error with friendly popup

---

## [1.11.0] - 2026-10-07

Release 1.11.0.

## Changes

- fix(admin): don't treat a failed or stale latest-number lookup as a first version
- feat(admin): version numbers and names for tafsir and translation versions
- fix(admin): keep Delete and Backspace from clearing the read-only source column
- fix(admin): keep the read-only version view from clearing cells
- fix(admin): ignore an older change count that answers after a newer one
- test(audio): look up a folder the timestamp editor's recitation has
- style(admin): shade before and after differently in change comparisons
- feat(admin): filter the review page by version and link to it from versions
- feat(admin): cut long changes short wherever diffs are shown
- feat(admin): disable Commit while the draft has no changes
- feat(admin): open a version change's full text in a popup
- feat(admin): colour version actions by what they do
- feat(admin): let the source language be shown or hidden
- feat(admin): view any version read-only in the editor's table
- feat(admin): show surah names beside numbers in the content editor
- fix(admin): show a first version's changes without waiting for every page
- feat(admin): show a change's review status as a chip on its header line
- feat(admin): open review full text in a popup and show each change's editor
- feat(admin): show review changes as before above after with highlighted words
- feat(admin): publish approved versions from the version list
- chore(audio): add an ayah timing fixture generator
- fix(audio): correct the timing file contract and load timings that exist
- fix(admin): default version language to the source, not the first listed
- feat(admin): add compact mode to content changes and highlight draft edits
- feat(admin): add read-only source column and refine saved-state logic
- feat(admin): fullscreen content editor with ayah context, narrower grid columns (#252)
- feat(admin): localize content grid filter UI and reduce cache block size
- feat(admin): rename the tafsirs sidebar item to "التفاسير وعلوم القرآن"
- feat(admin): narrow the position, surah and ayah columns in content grid
- feat(admin): near-fullscreen text editor with ayah context in content grid
- feat(admin): localize the content grid's loading overlay
- feat(admin): show a loading overlay while the content grid refetches
- feat(admin): infinite scrolling and server-side filters in content editor
- feat(admin): add CSV template download for translations and tafsirs
- fix(errors): stop reporting 4xx responses as server errors
- Update src/app/features/admin/audio/components/timestamp-editor/timestamp-editor.component.ts
- feat(audio): wire timestamp editor to the real timing contract
- feat: enhance timestamp editor and waveform renderer functionality
- feat: add waveform geometry utilities and tests

---

## [1.12.0] - 2026-10-08

Release 1.12.0.

## Changes

- fix(admin): drop the review selection when a new listing is requested
- feat(admin): bilingual version name and summary
- feat(admin): pre-approved checkbox when uploading a version
- feat(admin): bulk-approve changes on the review page

---

## [Unreleased]

### Added

- Upcoming features will be listed here

---

## [1.0.0] - 2025-01-XX

### Added

- **Quranic Asset Management System**
  - Gallery view for browsing Quranic content
  - Asset details pages with comprehensive information
  - Search and filter functionality
- **Publisher Portal**
  - Publisher profiles and management
  - Content submission and management
  - License tracking and enforcement
- **Content Standards Documentation**
  - Guidelines for Quranic content quality
  - Standards for authenticity and accuracy
- **Multi-language Support**
  - English and Arabic translations
  - RTL (Right-to-Left) support for Arabic
  - i18n infrastructure with @ngx-translate
- **Authentication System**
  - User registration and login
  - Profile completion workflow
  - Role-based access control
- **Development Infrastructure**
  - Netlify deployment configuration for 2 environments (staging, production)
  - Code formatting with Prettier
  - Pre-commit hooks with Husky and lint-staged
  - Comprehensive project documentation
  - CI/CD pipeline with GitHub Actions
- **Open Source Preparation**
  - MIT License
  - Contributing guidelines
  - Code of Conduct (Contributor Covenant)
  - Security policy
  - Issue and PR templates

### Tech Stack

- Angular 20.3.7
- TypeScript 5.9.2
- Ng-Zorro (Ant Design) 20.3.1
- RxJS 7.8.0
- @ngx-translate for i18n
- LESS for styling
- Karma + Jasmine for testing

---

## Release Template

### [Version] - YYYY-MM-DD

#### Added

- New features

#### Changed

- Changes in existing functionality

#### Deprecated

- Soon-to-be removed features

#### Removed

- Removed features

#### Fixed

- Bug fixes

#### Security

- Security updates

---

<!--
Versioning Guidelines:
- MAJOR version for incompatible API changes
- MINOR version for backwards-compatible functionality additions
- PATCH version for backwards-compatible bug fixes
-->
