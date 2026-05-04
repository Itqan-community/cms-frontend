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
| Start | `POST /auth/browser/v1/auth/provider/redirect` | **Form-encoded** body (`provider`, `process`, `callback_url`). **`process`** is `login` or `connect` only (allauth). Sign-up-with-provider uses **`login`**; incomplete profile continues via **`provider_signup`** → `/account/provider/signup`. |
| Headers / transport | **Browser** client URL; behavior differs by `process` | **`login`**: navigational **HTML form POST** only (no XHR). **`connect`**: `fetch(..., redirect: 'manual', credentials: 'include')` + **`X-Session-Token`** (browsers cannot attach custom headers on form POST). |
| Redirect | Browser | **`login`**: full document navigation from the form submit. **`connect`**: read **`Location`** from the `fetch` response when CORS exposes it; opaque cross-origin redirects surface a dedicated error string. |
| Return | Callback route | Bootstrap session (app then browser session as needed); authenticated → **`navigateByUrl(next)`**; pending flow (e.g. **`provider_signup`**) → routed via `pathForPendingFlow`; **`?error=`** → login (preserves **`next`** when present). |

### Provider consoles (Google Cloud / GitHub OAuth app)

Register **OAuth redirect / authorization callback URIs on the API host** (django-allauth default paths under `accounts/`), **not** the SPA URL:

| Environment | API host | Google & GitHub authorized redirect URI |
|-------------|----------|----------------------------------------|
| Staging | `staging.api.cms.itqan.dev` | `https://staging.api.cms.itqan.dev/accounts/google/login/callback/` |
| | | `https://staging.api.cms.itqan.dev/accounts/github/login/callback/` |
| Production | `api.cms.itqan.dev` | `https://api.cms.itqan.dev/accounts/google/login/callback/` |
| | | `https://api.cms.itqan.dev/accounts/github/login/callback/` |

The SPA path **`https://<cms-host>/account/provider/callback`** is sent as headless **`callback_url`** so Django can redirect the user **back to the CMS after** the provider round-trip completes on the API. It is **not** substituted for the provider console redirect URI.

### Backend env: `FRONTEND_BASE_URL`

Must match the **public CMS origin** (scheme + host, no trailing slash) so `HEADLESS_FRONTEND_URLS` build correct links:

| Environment | Expected example |
|-------------|------------------|
| Staging CMS | `https://staging.cms.itqan.dev` |
| Production CMS | `https://cms.itqan.dev` |

Mismatch causes failures after IdP consent even when social login works from Django admin (admin uses cookie flow on the API domain).

### Credentials source (staging vs production)

Staging **`SOCIALACCOUNT_PROVIDERS`** in backend base settings uses env **`GOOGLE_*` / `GITHUB_*`**. Production may rely on DB **`SocialApp`** rows instead. Ensure the active environment uses **one** source of truth so console redirect URIs match the deployed API host and client IDs.

### Manual QA checklist (Google / GitHub matrix)

**Staging / local with `oauthBrowserRedirectEnabled: true`**

1. **Google login** — `/account/login` → Google → return to `/account/provider/callback` → session OK → lands on `next` or `/gallery`.
2. **GitHub login** — same as Google.
3. **Google signup** — `/account/signup` social (`process=login`) → provider signup if BE requires → complete → app entry.
4. **GitHub signup** — same.
5. **Connect** — `/account/providers` → Connect Google/GitHub (`process=connect`) → return → list updates (requires same-origin API or proxy for cross-origin connect).
6. **Disconnect** — remove linked provider; list updates.
7. **Callback error** — `/account/provider/callback?error=...` → message → login with **`next`** preserved when provided.
8. **Production** — `oauthBrowserRedirectEnabled: true` in shipped env files; repeat 1–7 on production after deploy.

**Verification ops (before blaming FE)**

- [ ] Google Cloud OAuth client includes staging **and** prod API callback URLs above (exact paths, trailing slash).
- [ ] GitHub OAuth app authorization callback URL matches the API host in use.
- [ ] `FRONTEND_BASE_URL` secret matches the CMS URL users open.
- [ ] No conflicting DB `SocialApp` vs env `APP` credentials for the same provider in that environment.
