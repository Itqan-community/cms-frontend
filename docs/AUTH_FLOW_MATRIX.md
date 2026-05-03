# Auth flow matrix (django-allauth headless app client)

**Sources:** [allauth headless](https://docs.allauth.org/en/latest/headless/installation.html), [JWT strategy](https://docs.allauth.org/en/latest/headless/token-strategies/jwt-tokens.html), [MFA / WebAuthn](https://docs.allauth.org/en/latest/mfa/webauthn.html), OpenAPI [`../.temp/api-1.yaml`](../.temp/api-1.yaml).

Base URL: `{API_BASE_URL}/auth/app/v1` (deployed example: `/cms-api/auth/app/v1`).

Legend: **ST** = `X-Session-Token` from last `meta.session_token`. **401*** = continuation flow with `data.flows[]`, not always “hard failure”.

| Flow | Preconditions (BE) | Endpoint sequence | Key headers | Success | Pending / errors | Tokens (meta) |
|------|-------------------|-------------------|-------------|---------|------------------|---------------|
| Bootstrap config | Headless enabled | `GET /config` | — | `200` | — | Optional CSRF hints |
| Email/password login | Account auth | `POST /auth/login` `{email,password}` | ST if mid-flow | `200` authenticated | `401*` → `verify_email`, `mfa_authenticate`, etc. | `session_token` until done; then `access_token` + `refresh_token` (JWT strategy) |
| Email/password signup | Signup open | `POST /auth/signup` | ST if needed | `200` or `401*` verify | `403` closed, `409` conflict | As returned |
| Verify email | Verification mandatory / code | `GET /auth/email/verify` (key header) optional info; `POST /auth/email/verify` `{key}` | ST | `200` | `400/401/409` per spec | May issue JWT when complete |
| Password reset (link/key) | Reset enabled | `POST /auth/password/request`; `GET /auth/password/reset` (key header); `POST /auth/password/reset` `{key,password}` | ST when code flow | `200` | `401*` code pending | Per spec |
| Login by code | `ACCOUNT_LOGIN_BY_CODE_ENABLED` | `POST /auth/code/request`; `POST /auth/code/confirm` | ST | `200` | `401*` pending, `429` | Per spec |
| MFA at login | MFA enabled | `POST /auth/2fa/authenticate` `{code}` | ST | `200` | `400` bad code | JWT when complete |
| MFA WebAuthn at login | WebAuthn MFA | `GET /auth/webauthn/authenticate`; `POST` + credential | ST | `200` | `400` | JWT when complete |
| Reauth (password) | Sensitive action | `POST /auth/reauthenticate` `{password}` | ST + Bearer per deploy | `200` | `401` reauth flows | Refresh meta |
| Reauth MFA | | `POST /auth/2fa/reauthenticate` `{code}` | ST | `200` | `400` | — |
| Reauth WebAuthn | | `GET` + `POST /auth/webauthn/reauthenticate` | ST | `200` | `400` | — |
| Passkey login | `MFA_PASSKEY_LOGIN_ENABLED`, `webauthn` in supported types | `GET /auth/webauthn/login`; `POST` credential | Clear stale ST before first GET when logged out; attach ST on GET/POST once returned from GET `meta.session_token` | `200` | `401*` if more steps | Per spec |
| Passkey signup | `MFA_PASSKEY_SIGNUP_ENABLED` + **mandatory** email verification + **verification by code** | `POST /auth/webauthn/signup` `{email}`; `GET`; `navigator.credentials.get`; `PUT` credential | ST after initiate | `200` | `401` verify email, etc. | Per spec |
| Session | | `GET /auth/session`; `DELETE /auth/session` | ST / cookies | `200`/`401`/`410` | `410` gone | — |
| JWT refresh | JWT strategy | `POST /auth/app/v1/tokens/refresh` `{refresh_token}` | — | `200` | `400` | New access (+ refresh if rotated) |
| List authenticators | Logged in | `GET /account/authenticators` | ST | `200` | `401` | — |
| TOTP | `totp` supported | `GET /account/authenticators/totp` (404 + `meta.secret` if none); `POST` `{code}` activate; `DELETE` deactivate | ST | `200`/`404` setup | `401` reauth | `meta.recovery_codes_generated` on activate |
| Recovery codes | `recovery_codes` supported | `GET /account/authenticators/recovery-codes` (lists `unused_codes`); `POST` regenerate | ST | `200 usually` | `401` reauth, `400` cannot generate | Show/copy/regenerate per UX |
| Add passkey (account) | | `GET /account/authenticators/webauthn`; `POST` credential | ST | `200` | `401` reauth, `409` conflict | — |

## JWT note (allauth)

After full authentication, docs allow dropping `X-Session-Token` and using `Authorization: Bearer` for headless + app APIs. This FE keeps ST for `/auth/app/v1/*` while continuing to use Bearer for `/cms-api/*` non-auth routes.
