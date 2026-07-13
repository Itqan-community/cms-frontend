import { HttpErrorResponse } from '@angular/common/http';
import {
  extractAllauthErrorItems,
  getErrorMessage,
  isAngularHttpFailureMessage,
  isRestrictedForTenantConflictError,
} from './error.utils';
import { isMessageLocalizedForUi } from './message-localization.util';

export interface ApiErrorTranslator {
  instant(key: string, interpolateParams?: Record<string, unknown>): string;
  readonly currentLang?: string;
}

export interface ResolveApiErrorOptions {
  fallbackKey: string;
}

/** CMS portal `error_name` → i18n key. */
const CMS_ERROR_NAME_I18N: Record<string, string> = {
  invalid_status: 'ADMIN.ACCESS_REQUESTS.MESSAGES.ALREADY_DECIDED',
  restricted_for_tenant_conflict: 'ERRORS.RESTRICTED_FOR_TENANT_CONFLICT',
  tenant_required: 'ERRORS.TENANT_REQUIRED',
};

/** django-allauth `errors[].code` values reused on CMS endpoints. */
const CMS_ERROR_CODE_I18N: Record<string, string> = {
  restricted_for_tenant_conflict: 'ERRORS.RESTRICTED_FOR_TENANT_CONFLICT',
};

function extractErrorName(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }
  const body = error.error;
  if (!body || typeof body !== 'object') {
    return null;
  }
  const name = (body as { error_name?: unknown }).error_name;
  return typeof name === 'string' && name.trim() ? name.trim() : null;
}

function resolveErrorNameI18nKey(errorName: string | null): string | null {
  if (!errorName) {
    return null;
  }
  return CMS_ERROR_NAME_I18N[errorName] ?? null;
}

function resolveCodeI18nKey(code: string | undefined): string | null {
  if (!code) {
    return null;
  }
  return CMS_ERROR_CODE_I18N[code] ?? null;
}

/**
 * Resolve a user-facing CMS/portal API error string:
 * 1. Known `error_name` or `errors[].code` → client i18n
 * 2. Backend `message` when localized for UI language
 * 3. Fallback i18n key
 */
export function resolveApiErrorMessage(
  error: unknown,
  options: ResolveApiErrorOptions,
  translate: ApiErrorTranslator
): string {
  const { fallbackKey } = options;
  const uiLang = translate.currentLang || 'ar';

  const errorName = extractErrorName(error);
  const errorNameKey = resolveErrorNameI18nKey(errorName);
  if (errorNameKey) {
    return translate.instant(errorNameKey);
  }

  const items = extractAllauthErrorItems(error);
  const primary = items.find((e) => e.message?.trim()) ?? items[0];
  if (primary?.code) {
    const codeKey = resolveCodeI18nKey(primary.code);
    if (codeKey) {
      return translate.instant(codeKey);
    }
  }

  const rawBackendMessage = primary?.message?.trim() || getErrorMessage(error)?.trim() || '';
  const backendMessage =
    rawBackendMessage && !isAngularHttpFailureMessage(rawBackendMessage) ? rawBackendMessage : '';
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

  if (error instanceof ErrorEvent) {
    const clientMessage = error.message?.trim() ?? '';
    if (clientMessage && isMessageLocalizedForUi(clientMessage, uiLang)) {
      return clientMessage;
    }
  }

  return translate.instant(fallbackKey);
}

/** Errors handled locally by feature components — skip global interceptor toast. */
export function shouldSuppressGlobalErrorToast(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse)) {
    return false;
  }

  const errorName = extractErrorName(error);
  if (errorName === 'invalid_status' || errorName === 'tenant_required') {
    return true;
  }

  if (isRestrictedForTenantConflictError(error)) {
    return true;
  }

  return false;
}

export function resolveApiHttpError(
  error: HttpErrorResponse,
  fallbackKey: string,
  translate: ApiErrorTranslator
): string {
  return resolveApiErrorMessage(error, { fallbackKey }, translate);
}
