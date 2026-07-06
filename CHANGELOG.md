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
