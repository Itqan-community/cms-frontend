import { HttpErrorResponse } from '@angular/common/http';
import type { AllauthErrorItem } from '../../core/auth/headless/headless-api.types';
import { extractAllauthErrorItems, getErrorMessage } from './error.utils';

/**
 * django-allauth headless codes observed or documented (see allauth account adapter + headless docs).
 * Backend messages are localized via `Accept-Language` when the API honors it.
 */
export type AuthErrorContext =
  | 'login'
  | 'register'
  | 'verify_email'
  | 'login_by_code'
  | 'mfa_totp'
  | 'mfa_webauthn'
  | 'reauth_password'
  | 'reauth_mfa'
  | 'reset_password'
  | 'change_password'
  | 'forgot_password'
  | 'trust'
  | 'oauth'
  | 'provider_signup'
  | 'profile'
  | 'security'
  | 'sessions'
  | 'email'
  | 'providers'
  | 'api_keys'
  | 'generic';

export interface AuthErrorTranslator {
  instant(key: string, interpolateParams?: Record<string, unknown>): string;
  readonly currentLang?: string;
}

export interface ResolveAuthErrorOptions {
  fallbackKey: string;
  context?: AuthErrorContext;
}

const GENERIC_BACKEND_MESSAGES = new Set(
  ['server error', 'error', 'bad request', 'internal server error'].map((s) => s.toLowerCase())
);

/** Global code → i18n key (context-agnostic). */
const AUTH_ERROR_CODE_I18N: Record<string, string> = {
  account_inactive: 'AUTH.ERRORS.CODES.ACCOUNT_INACTIVE',
  cannot_remove_primary_email: 'AUTH.ERRORS.CODES.CANNOT_REMOVE_PRIMARY_EMAIL',
  duplicate_email: 'AUTH.ERRORS.CODES.DUPLICATE_EMAIL',
  email_password_mismatch: 'AUTH.ERRORS.CODES.EMAIL_PASSWORD_MISMATCH',
  email_taken: 'AUTH.ERRORS.CODES.EMAIL_TAKEN',
  invalid: 'AUTH.ERRORS.CODES.INVALID',
  invalid_credentials: 'AUTH.ERRORS.CODES.INVALID_CREDENTIALS',
  password_mismatch: 'AUTH.ERRORS.CODES.PASSWORD_MISMATCH',
  phone_password_mismatch: 'AUTH.ERRORS.CODES.PHONE_PASSWORD_MISMATCH',
  required: 'AUTH.ERRORS.CODES.REQUIRED',
  too_many_login_attempts: 'AUTH.ERRORS.CODES.TOO_MANY_LOGIN_ATTEMPTS',
  unverified_email: 'AUTH.ERRORS.CODES.UNVERIFIED_EMAIL',
  username_password_mismatch: 'AUTH.ERRORS.CODES.USERNAME_PASSWORD_MISMATCH',
};

/** Context + code → i18n key overrides global map. */
const AUTH_ERROR_CONTEXT_CODE_I18N: Partial<
  Record<AuthErrorContext, Partial<Record<string, string>>>
> = {
  login_by_code: {
    incorrect_code: 'AUTH.LOGIN_BY_CODE.INCORRECT_CODE',
  },
  verify_email: {
    incorrect_code: 'AUTH.VERIFY_EMAIL.ERROR',
  },
  mfa_totp: {
    incorrect_code: 'AUTH.MFA.INCORRECT_CODE',
  },
  mfa_webauthn: {
    incorrect_code: 'AUTH.PASSKEY.WEBAUTHN_STATE_ERROR',
  },
  reauth_password: {
    email_password_mismatch: 'AUTH.REAUTH.INCORRECT_PASSWORD',
    invalid_credentials: 'AUTH.REAUTH.INCORRECT_PASSWORD',
    incorrect_code: 'AUTH.REAUTH.INCORRECT_PASSWORD',
  },
  reauth_mfa: {
    incorrect_code: 'AUTH.REAUTH.MFA_ERROR',
  },
  login: {
    email_password_mismatch: 'AUTH.LOGIN.ERRORS.LOGIN_FAILED',
    invalid_credentials: 'AUTH.LOGIN.ERRORS.LOGIN_FAILED',
    too_many_login_attempts: 'AUTH.ERRORS.CODES.TOO_MANY_LOGIN_ATTEMPTS',
  },
  register: {
    email_taken: 'AUTH.ERRORS.CODES.EMAIL_TAKEN',
  },
  change_password: {
    email_password_mismatch: 'AUTH.CHANGE_PASSWORD.ERROR',
    invalid_credentials: 'AUTH.CHANGE_PASSWORD.ERROR',
  },
};

const ARABIC_SCRIPT_RE = /[\u0600-\u06FF]/;

export function isMessageLocalizedForUi(message: string, uiLang: string): boolean {
  const trimmed = message.trim();
  if (!trimmed || GENERIC_BACKEND_MESSAGES.has(trimmed.toLowerCase())) {
    return false;
  }
  const hasArabic = ARABIC_SCRIPT_RE.test(trimmed);
  const lang = (uiLang || 'ar').toLowerCase().split('-')[0];
  if (lang === 'ar') {
    return hasArabic;
  }
  if (lang === 'en') {
    return !hasArabic;
  }
  return true;
}

function resolveCodeI18nKey(code: string | undefined, context?: AuthErrorContext): string | null {
  if (!code) {
    return null;
  }
  if (context) {
    const contextual = AUTH_ERROR_CONTEXT_CODE_I18N[context]?.[code];
    if (contextual) {
      return contextual;
    }
  }
  return AUTH_ERROR_CODE_I18N[code] ?? null;
}

function pickPrimaryErrorItem(items: AllauthErrorItem[]): AllauthErrorItem | null {
  if (!items.length) {
    return null;
  }
  return items.find((e) => e.message?.trim()) ?? items[0] ?? null;
}

/**
 * Resolve a user-facing auth error string:
 * 1. Known `code` (+ context) → client i18n
 * 2. Backend `message` when localized for UI language
 * 3. Page fallback i18n key
 */
export function resolveAuthErrorMessage(
  error: unknown,
  options: ResolveAuthErrorOptions,
  translate: AuthErrorTranslator
): string {
  const { fallbackKey, context } = options;
  const uiLang = translate.currentLang || 'ar';
  const items = extractAllauthErrorItems(error);
  const primary = pickPrimaryErrorItem(items);

  if (primary?.code) {
    const codeKey = resolveCodeI18nKey(primary.code, context);
    if (codeKey) {
      return translate.instant(codeKey);
    }
  }

  const backendMessage = primary?.message?.trim() || getErrorMessage(error)?.trim() || '' || '';
  if (backendMessage && isMessageLocalizedForUi(backendMessage, uiLang)) {
    return backendMessage;
  }

  if (items.length > 1) {
    const joined = items
      .map((e) => e.message)
      .filter(Boolean)
      .join(' ');
    if (joined && isMessageLocalizedForUi(joined, uiLang)) {
      return joined;
    }
  }

  return translate.instant(fallbackKey);
}

/** Convenience when only a fallback key and optional context are needed. */
export function resolveAuthHttpError(
  error: HttpErrorResponse,
  fallbackKey: string,
  translate: AuthErrorTranslator,
  context?: AuthErrorContext
): string {
  return resolveAuthErrorMessage(error, { fallbackKey, context }, translate);
}
