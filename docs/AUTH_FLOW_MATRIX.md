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

## Browser OAuth (Google / GitHub, headless app client)

Canonical SPA callback route: **`/account/provider/callback`** (`HEADLESS_FRONTEND_URLS.socialaccount_login_error` on BE). Legacy **`/auth/oauth/callback`** still mounts the same component.

| Step | Client | Details |
|------|--------|---------|
| Start | `POST /auth/app/v1/auth/provider/redirect` | **Form-encoded** body (`provider`, `process`, `callback_url`). **`process`** is `login` or `connect` only (allauth). Sign-up-with-provider uses **`login`**; incomplete profile continues via **`provider_signup`** → `/account/provider/signup`. |
| Headers | APP client | `User-Agent: django-allauth example app`; **`connect`** sends **`X-Session-Token`**. Anonymous **`login`** omits ST so stale tokens do not bind the wrong session. |
| Redirect | Browser | Same-origin API URLs use `fetch(redirect: 'manual')` + `Location`. Cross-origin dev setups fall back to a real HTML **form POST** (full navigation) for **`login`** only; **`connect`** requires readable redirect headers or same-origin API. |
| Return | Callback route | `GET /auth/session` → authenticated **`navigateByUrl(next)`**; **`401`** with pending **`provider_signup`** → provider signup page; **`?error=`** → login (preserves **`next`** when present). |

**Manual QA checklist**

1. Login with Google / GitHub (`oauthBrowserRedirectEnabled: true`, local/staging).
2. Register-page social buttons (`process=login`) → provider signup path when BE requires it.
3. Connected accounts: Connect Google/GitHub (`process=connect`), then disconnect.
4. Callback `?error=` handling + redirect back with **`next`**.
5. Production remains gated (`oauthBrowserRedirectEnabled: false`) until validated.
