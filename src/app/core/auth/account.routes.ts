import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

/** Matches official SPA `data: { hideHeader: true }` usage for focused auth layouts. */
const H = { hideHeader: true };

/**
 * Canonical `/account/...` routes plus legacy CMS aliases (`/login`, `/register`, …)
 * so bookmarks keep working without relying on redirects thatdrop query strings.
 */
export const accountAuthRoutes: Routes = [
  /* ----- Legacy aliases ----- */
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./pages/verify-email/verify-email.page').then((m) => m.VerifyEmailPage),
    data: H,
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'login-by-code',
    loadComponent: () =>
      import('./pages/login-by-code/login-by-code.page').then((m) => m.LoginByCodePage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'mfa',
    loadComponent: () => import('./pages/mfa/mfa.page').then((m) => m.MfaPage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'reauthenticate',
    loadComponent: () =>
      import('./pages/reauthenticate/reauthenticate.page').then((m) => m.ReauthenticatePage),
    canActivate: [authGuard],
    data: H,
  },
  {
    path: 'provider-signup',
    loadComponent: () =>
      import('./pages/provider-signup/provider-signup.page').then((m) => m.ProviderSignupPage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'passkey',
    loadComponent: () => import('./pages/passkey/passkey.page').then((m) => m.PasskeyPage),
    data: H,
  },
  {
    path: 'passkey/setup',
    loadComponent: () => import('./pages/passkey/passkey.page').then((m) => m.PasskeyPage),
    canActivate: [authGuard],
    data: { ...H, mode: 'setup' },
  },

  /* ----- Official `/account/*` ----- */
  {
    path: 'account/login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'account/profile',
    loadComponent: () =>
      import('./pages/profile/profile.page').then((m) => m.AccountProfilePage),
    canActivate: [authGuard],
    data: H,
  },
  {
    path: 'account/login/code',
    loadComponent: () =>
      import('./pages/login-by-code/login-by-code.page').then((m) => m.LoginByCodePage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'account/login/code/confirm',
    loadComponent: () =>
      import('./pages/login-by-code/login-by-code.page').then((m) => m.LoginByCodePage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'account/logout',
    loadComponent: () => import('./pages/logout/logout.page').then((m) => m.LogoutPage),
    data: H,
  },
  {
    path: 'account/email',
    loadComponent: () =>
      import('./pages/change-email/change-email.page').then((m) => m.ChangeEmailPage),
    canActivate: [authGuard],
    data: H,
  },
  {
    path: 'account/providers',
    loadComponent: () =>
      import('./pages/manage-providers/manage-providers.page').then((m) => m.ManageProvidersPage),
    canActivate: [authGuard],
    data: H,
  },
  {
    path: 'account/provider/callback',
    loadComponent: () =>
      import('./pages/oauth-callback/oauth-callback.page').then((m) => m.OauthCallbackPage),
    data: { ...H, beHeadlessPath: 'socialaccount_login_error' },
  },
  {
    path: 'account/provider/signup',
    loadComponent: () =>
      import('./pages/provider-signup/provider-signup.page').then((m) => m.ProviderSignupPage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'account/signup',
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'account/signup/passkey',
    loadComponent: () => import('./pages/passkey/passkey.page').then((m) => m.PasskeyPage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'account/signup/passkey/create',
    loadComponent: () => import('./pages/passkey/passkey.page').then((m) => m.PasskeyPage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'account/verify-email',
    loadComponent: () =>
      import('./pages/verify-email/verify-email.page').then((m) => m.VerifyEmailPage),
    data: H,
  },
  {
    path: 'account/verify-email/:key',
    loadComponent: () =>
      import('./pages/verify-email/verify-email.page').then((m) => m.VerifyEmailPage),
    data: H,
  },
  {
    path: 'account/password/reset',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'account/password/reset/confirm',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'account/password/reset/complete',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'account/password/reset/key/:key',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.page').then((m) => m.ResetPasswordPage),
    canActivate: [guestGuard],
    data: { ...H, beHeadlessPath: 'account_reset_password_from_key' },
  },
  {
    path: 'account/password/change',
    loadComponent: () =>
      import('./pages/change-password/change-password.page').then((m) => m.ChangePasswordPage),
    canActivate: [authGuard],
    data: H,
  },
  {
    path: 'account/2fa',
    loadComponent: () =>
      import('./pages/security-settings/security-settings.page').then((m) => m.SecuritySettingsPage),
    canActivate: [authGuard],
    data: H,
  },
  {
    path: 'account/2fa/trust',
    loadComponent: () => import('./pages/trust/trust.page').then((m) => m.TrustPage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'account/authenticate/totp',
    loadComponent: () => import('./pages/mfa/mfa.page').then((m) => m.MfaPage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'account/authenticate/recovery-codes',
    loadComponent: () => import('./pages/mfa/mfa.page').then((m) => m.MfaPage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'account/authenticate/webauthn',
    loadComponent: () => import('./pages/mfa/mfa.page').then((m) => m.MfaPage),
    canActivate: [guestGuard],
    data: H,
  },
  {
    path: 'account/reauthenticate',
    loadComponent: () =>
      import('./pages/reauthenticate/reauthenticate.page').then((m) => m.ReauthenticatePage),
    canActivate: [authGuard],
    data: H,
  },
  {
    path: 'account/reauthenticate/totp',
    loadComponent: () =>
      import('./pages/reauthenticate/reauthenticate.page').then((m) => m.ReauthenticatePage),
    canActivate: [authGuard],
    data: H,
  },
  {
    path: 'account/reauthenticate/recovery-codes',
    loadComponent: () =>
      import('./pages/reauthenticate/reauthenticate.page').then((m) => m.ReauthenticatePage),
    canActivate: [authGuard],
    data: H,
  },
  {
    path: 'account/reauthenticate/webauthn',
    loadComponent: () =>
      import('./pages/reauthenticate/reauthenticate.page').then((m) => m.ReauthenticatePage),
    canActivate: [authGuard],
    data: H,
  },
  {
    path: 'account/2fa/totp/activate',
    loadComponent: () =>
      import('./pages/security-settings/security-settings.page').then((m) => m.SecuritySettingsPage),
    canActivate: [authGuard],
    data: H,
  },
  {
    path: 'account/2fa/totp/deactivate',
    loadComponent: () =>
      import('./pages/security-settings/security-settings.page').then((m) => m.SecuritySettingsPage),
    canActivate: [authGuard],
    data: H,
  },
  {
    path: 'account/2fa/recovery-codes',
    loadComponent: () =>
      import('./pages/security-settings/security-settings.page').then((m) => m.SecuritySettingsPage),
    canActivate: [authGuard],
    data: H,
  },
  {
    path: 'account/2fa/recovery-codes/generate',
    loadComponent: () =>
      import('./pages/security-settings/security-settings.page').then((m) => m.SecuritySettingsPage),
    canActivate: [authGuard],
    data: H,
  },
  {
    path: 'account/2fa/webauthn',
    loadComponent: () =>
      import('./pages/security-settings/security-settings.page').then((m) => m.SecuritySettingsPage),
    canActivate: [authGuard],
    data: H,
  },
  {
    path: 'account/2fa/webauthn/add',
    loadComponent: () => import('./pages/passkey/passkey.page').then((m) => m.PasskeyPage),
    canActivate: [authGuard],
    data: { ...H, mode: 'setup' },
  },
  {
    path: 'account/sessions',
    loadComponent: () => import('./pages/sessions/sessions.page').then((m) => m.SessionsPage),
    canActivate: [authGuard],
    data: H,
  },

  /* Alternate OAuth callback URL kept for backwards compatibility */
  {
    path: 'auth/oauth/callback',
    loadComponent: () =>
      import('./pages/oauth-callback/oauth-callback.page').then((m) => m.OauthCallbackPage),
    data: H,
  },

  {
    path: 'account/security',
    redirectTo: '/account/2fa',
    pathMatch: 'full',
  },
];
