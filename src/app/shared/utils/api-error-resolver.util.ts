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
  folder_name_required: 'ADMIN.RECITATIONS.FOLDERS.ERR_NAME_REQUIRED',
  cannot_delete_default_folder: 'ADMIN.RECITATIONS.FOLDERS.MESSAGES.CANNOT_DELETE_DEFAULT',
  cannot_hide_default_folder: 'ADMIN.RECITATIONS.FOLDERS.MESSAGES.CANNOT_HIDE_DEFAULT',
  cannot_set_hidden_folder_as_default:
    'ADMIN.RECITATIONS.FOLDERS.MESSAGES.CANNOT_SET_HIDDEN_AS_DEFAULT',
  cannot_unset_default_folder: 'ADMIN.RECITATIONS.FOLDERS.MESSAGES.CANNOT_UNSET_DEFAULT',
  folder_not_found: 'ADMIN.RECITATIONS.FOLDERS.MESSAGES.NOT_FOUND',
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

/** django-ninja `loc` prefixes that are not part of the user-facing field name. */
const VALIDATION_LOC_PREFIXES = new Set([
  'body',
  'query',
  'path',
  'header',
  'cookie',
  'form',
  'file',
  'payload',
]);

interface PydanticErrorItem {
  type?: unknown;
  loc?: unknown;
  msg?: unknown;
}

/** Field name from a pydantic `loc` (`['body', 'payload', 'name_ar']` → `name ar`). */
function validationFieldLabel(loc: unknown): string {
  if (!Array.isArray(loc)) {
    return '';
  }
  const field = [...loc]
    .reverse()
    .find((part) => typeof part === 'string' && !VALIDATION_LOC_PREFIXES.has(part));
  return typeof field === 'string' ? field.replace(/_/g, ' ') : '';
}

/**
 * django-ninja `validation_error` → per-field message. `extra` is pydantic's error list
 * (`{ type, loc, msg }[]`, English `msg`) or, for Django `ValidationError`, a list of strings.
 */
function resolveValidationErrorMessage(
  error: unknown,
  uiLang: string,
  translate: ApiErrorTranslator
): string | null {
  if (!(error instanceof HttpErrorResponse) || extractErrorName(error) !== 'validation_error') {
    return null;
  }
  const extra = (error.error as { extra?: unknown }).extra;
  if (!Array.isArray(extra)) {
    return null;
  }

  const parts = extra
    .map((item: unknown): string => {
      if (typeof item === 'string') {
        return isMessageLocalizedForUi(item, uiLang) ? item.trim() : '';
      }
      if (!item || typeof item !== 'object') {
        return '';
      }
      const { type, loc, msg } = item as PydanticErrorItem;
      const field = validationFieldLabel(loc);
      if (!field) {
        return '';
      }
      if (typeof msg === 'string' && msg.trim() && isMessageLocalizedForUi(msg, uiLang)) {
        return `${field}: ${msg.trim().replace(/\.?$/, '.')}`;
      }
      const key = type === 'missing' ? 'ERRORS.FIELD_REQUIRED' : 'ERRORS.FIELD_INVALID';
      return translate.instant(key, { field });
    })
    .filter(Boolean);

  return parts.length ? [...new Set(parts)].join(' ') : null;
}

/** Status-appropriate fallback so client errors (4xx) are not reported as server errors. */
export function fallbackKeyForHttpStatus(status: number): string {
  if (status === 0) {
    return 'ERRORS.NETWORK_ERROR';
  }
  if (status === 400 || status === 422) {
    return 'ERRORS.VALIDATION_ERROR';
  }
  if (status === 404) {
    return 'ERRORS.NOT_FOUND';
  }
  if (status >= 400 && status < 500) {
    return 'ERRORS.REQUEST_FAILED';
  }
  return 'ERRORS.SERVER_ERROR';
}

/**
 * Resolve a user-facing CMS/portal API error string:
 * 1. Known `error_name` or `errors[].code` → client i18n
 * 2. django-ninja `validation_error` field details
 * 3. Backend `message` when localized for UI language
 * 4. Fallback i18n key
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

  const validationMessage = resolveValidationErrorMessage(error, uiLang, translate);
  if (validationMessage) {
    return validationMessage;
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
  if (
    errorName === 'invalid_status' ||
    errorName === 'tenant_required' ||
    // Handled locally by the content editor grid with a friendly popup.
    errorName === 'no_changes_to_publish'
  ) {
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
