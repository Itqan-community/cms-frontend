# Auth E2E / manual closure checklist

Run against a deployed environment where `API_BASE_URL` matches the backend (e.g. `/cms-api`). Use browser devtools to capture status codes and `flows[]` for each step.

**Local:** use `npm run start:local` (see `src/environments/environment.local.ts`: default API `http://127.0.0.1:8000/cms-api`). Set backend `FRONTEND_BASE_URL` to your SPA origin (e.g. `http://localhost:4200`). For WebAuthn/passkeys locally, prefer `http://localhost:4200` with `WEBAUTHN_RP_ID=localhost` unless you align RP ID with another hostname.

For each row: **Pass** only if behavior matches [AUTH_FLOW_MATRIX.md](AUTH_FLOW_MATRIX.md) and live OpenAPI.

| # | Scenario | Steps | Pass? | Notes |
|---|----------|--------|-------|-------|
| 1 | Email/password login | Login with valid user | ☐ | |
| 2 | Login + MFA TOTP | User with TOTP; complete `/mfa` with app code | ☐ | |
| 3 | Login + MFA WebAuthn | User with security key; use "Use security key" on `/mfa` | ☐ | |
| 4 | Login + recovery code | Enter unused recovery code in `/mfa` | ☐ | Same endpoint as TOTP code |
| 5 | Signup + verify | Register → verify email code → session completes | ☐ | |
| 6 | Password reset (code) | Forgot → reset with code | ☐ | |
| 7 | Login by code | Request code → confirm | ☐ | |
| 8 | Passkey login | `/passkey?flow=login` | ☐ | |
| 9 | Passkey signup | `/passkey?flow=signup` + email verify if required | ☐ | |
| 10 | JWT refresh | Expire access; CMS call triggers refresh or session recheck | ☐ | |
| 11 | Security hub | `/account/security` lists authenticators; TOTP setup; recovery view/copy/download/regenerate | ☐ | |
| 12 | Reauth | Trigger sensitive action → `/reauthenticate` password / passkey / MFA code | ☐ | |
| 13 | Logout | `DELETE .../auth/session` clears client tokens | ☐ | |

**Classification (for audit):** mark each flow *Perfect* / *Misimplemented* / *Missing* with evidence (screenshot + HAR or curl).

Backend: run `python manage.py test apps.users.tests.test_headless_mfa_contract` in a venv with Django installed.
