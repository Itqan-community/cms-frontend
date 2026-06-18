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
