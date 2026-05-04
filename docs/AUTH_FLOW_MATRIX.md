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

## Google Sign-In — App-mode (`provider/token`)

When **`socialGoogleUseAppToken`** is **`true`** and **`googleClientId`** is set in Angular [`environment`](src/environments/environment.staging.ts), login / signup / connect use:

1. **Google Identity Services** (`https://accounts.google.com/gsi/client`) → user picks an account → **JWT `credential`** (ID token).
2. **`POST /cms-api/auth/app/v1/auth/provider/token`** with JSON body `{ "provider": "google", "process": "login"|"connect", "token": { "id_token": "<credential>", "client_id": "<googleClientId>" } }`.
3. Store **`meta.session_token`** → **`X-Session-Token`** on subsequent **`/auth/app/v1/*`** requests (JWT strategy).

**GitHub** still uses **browser redirect** (`POST …/browser/…/auth/provider/redirect`) when **`oauthBrowserRedirectEnabled`** until a token or popup flow is added.

### CSP (when headers are tightened)

There is **no restrictive CMS meta CSP** in this repo today. If infra adds **Content-Security-Policy**, allow Google Identity Services: include **`https://accounts.google.com`** in **`script-src`** (and follow [Google’s GSI CSP guidance](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid#get_your_google_api_client_id) for **`frame-src`** / **`connect-src`** / **`style-src`** as applicable).

## Browser OAuth (Google / GitHub, headless browser client)

Canonical SPA callback route: **`/account/provider/callback`** (`HEADLESS_FRONTEND_URLS.socialaccount_login_error` on BE). Legacy **`/auth/oauth/callback`** still mounts the same component.

| Step | Client | Details |
|------|--------|---------|
| Start | `POST /auth/browser/v1/auth/provider/redirect` | **Form-encoded** body (`provider`, `process`, `callback_url`). **`process`** is `login` or `connect` only (allauth). Sign-up-with-provider uses **`login`**; incomplete profile continues via **`provider_signup`** → `/account/provider/signup`. |
| Headers / transport | **Browser** client URL | **`login`** and **`connect`** use navigational **HTML form POST** only (`fetch`/XHR breaks OAuth with SPA↔API hosts: cross-origin **`302`** is **`opaqueredirect`**, no readable **`Location`**). FE **GETs `/auth/browser/v1/config`** with credentials whenever no CSRF is cached before starting. **`connect`** does not send **`X-Session-Token`** on the form; Django binds the session from **cookies** on the API host (same-site with CMS + ST pre-check in app). |
| Redirect | Browser | Full document navigation from the form **`submit`** to the IdP authorize URL (return chain unchanged). |
| Return | Callback route | **Session:** `GET …/auth/app/v1/auth/session` often returns **HTTP 401** anonymous after cookie-only OAuth; Angular surfaces that as **`HttpErrorResponse`**, so FE must read the JSON **`error`** body (or fall through) and then **`GET …/auth/browser/v1/auth/session`** with credentials. **`?error=`** on callback → login. **GitHub:** if already logged into github.com with prior consent for this OAuth app, the authorize step can bounce in **one 302 chain** — you never see GitHub UI even though **`github.com/login/oauth/authorize`** ran (check HAR / document redirects). |

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

### Debugging OAuth callback (login vs connect)

When `/account/provider/callback` fails after Google/GitHub consent:

1. Copy the **full browser URL** on that page (watch for **`error`**, **`error_description`**, **`next`**). The CMS maps common values to specific `AUTH.OAUTH.*` strings.
2. In **Network** (filter `session`), record HTTP status and JSON for **`GET …/auth/app/v1/auth/session`** and **`GET …/auth/browser/v1/auth/session`** on that load.
3. Under **Application → Cookies** for the **API host** (e.g. `staging.api.…`), check **`sessionid`** / **`csrftoken`** after the provider round-trip and before those `GET …/session` requests.

If both session responses are **anonymous** (no `data.user`) for **`process=login`** while **`process=connect`** still works, prioritize **backend / env**: **`FRONTEND_BASE_URL`**, **`HEADLESS_FRONTEND_URLS`**, cookie **`SameSite`** / domain, and django-allauth logs for social **`login`**.

### Credentials source (staging vs production)

Staging **`SOCIALACCOUNT_PROVIDERS`** in backend base settings uses env **`GOOGLE_*` / `GITHUB_*`**. Production may rely on DB **`SocialApp`** rows instead. Ensure the active environment uses **one** source of truth so console redirect URIs match the deployed API host and client IDs.

### Manual QA checklist (Google / GitHub matrix)

**With `socialGoogleUseAppToken: true` and `googleClientId` set (staging/production)**

1. **Google login** — `/account/login` → Google branded button → `POST …/auth/provider/token` → **`X-Session-Token`** set → navigates per `next` or `/gallery` (or `/account/provider/signup` when required).
2. **Google signup** — same widget on `/account/signup` (`process=login`).
3. **Google connect** — `/account/providers` → mounted Google button → **`process=connect`** → list refreshes.
4. **GitHub login/signup/connect** — still **full-page** browser redirect → `/account/provider/callback` bootstrap when **`oauthBrowserRedirectEnabled`**.

**Legacy / fallback (Google via browser redirect)**

If **`socialGoogleUseAppToken`** is false or **`googleClientId`** is empty but **`oauthBrowserRedirectEnabled`** is true, Google uses the **Browser OAuth** rows below (`POST …/browser/…/provider/redirect`).

**Staging / local with only `oauthBrowserRedirectEnabled: true` (no Google app token)**

1. **Google login** — `/account/login` → navigational POST → IdP → `/account/provider/callback` → session bootstrap.
2. **GitHub login** — same redirect + callback pattern.
3. **Google / GitHub signup** — `/account/signup` social → callback or `provider_signup` when required.
4. **Connect** — `/account/providers` → form POST redirect → callback → list refresh.
5. **Disconnect** — remove linked provider; list updates.
6. **Callback error** — `/account/provider/callback?error=...` → CMS message → login with **`next`** when provided.
7. **Production** — set **`googleClientId`** for app-mode Google; keep **`oauthBrowserRedirectEnabled`** for GitHub; repeat checks after deploy.

**Verification ops (before blaming FE)**

- [ ] **`googleClientId`** in Angular matches backend **`GOOGLE_CLIENT_ID`** Web client (Authorized JavaScript origins include your CMS origins for GSI).
- [ ] GitHub OAuth app authorization callback URL matches the API host in use.
- [ ] `FRONTEND_BASE_URL` secret matches the CMS URL users open.
- [ ] No conflicting DB `SocialApp` vs env `APP` credentials for the same provider in that environment.
