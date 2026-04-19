import { TranslateService } from '@ngx-translate/core';

import type { RecitationTimingUploadOut } from '../models/recitation-timings.models';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Shared lines for API `ResultDict` / timing upload success body fields. */
function buildResultDictDetailLines(
  data: Record<string, unknown>,
  translate: TranslateService
): string[] {
  const lines: string[] = [];

  const created = data['created_total'];
  const updated = data['updated_total'];
  const skipped = data['skipped_total'];
  if (typeof created === 'number' || typeof updated === 'number' || typeof skipped === 'number') {
    const parts: string[] = [];
    if (typeof created === 'number') {
      parts.push(
        translate.instant('ADMIN.RECITATIONS.TIMINGS.ERRORS.EXTRA_CREATED', { n: created })
      );
    }
    if (typeof updated === 'number') {
      parts.push(
        translate.instant('ADMIN.RECITATIONS.TIMINGS.ERRORS.EXTRA_UPDATED', { n: updated })
      );
    }
    if (typeof skipped === 'number') {
      parts.push(
        translate.instant('ADMIN.RECITATIONS.TIMINGS.ERRORS.EXTRA_SKIPPED', { n: skipped })
      );
    }
    if (parts.length) lines.push(parts.join(' · '));
  }

  const missing = data['missing_tracks'];
  if (Array.isArray(missing) && missing.length) {
    const nums = missing.filter((x): x is number => typeof x === 'number');
    if (nums.length) {
      lines.push(
        translate.instant('ADMIN.RECITATIONS.TIMINGS.ERRORS.EXTRA_MISSING_TRACKS', {
          surahs: nums.join(', '),
        })
      );
    }
  }

  const fileErrors = data['file_errors'];
  if (Array.isArray(fileErrors) && fileErrors.length) {
    const errs = fileErrors.filter(
      (x): x is string => typeof x === 'string' && x.trim().length > 0
    );
    if (errs.length) {
      lines.push(translate.instant('ADMIN.RECITATIONS.TIMINGS.ERRORS.EXTRA_FILE_ISSUES'));
      for (const e of errs) {
        lines.push(`• ${e}`);
      }
    }
  }

  return lines;
}

/**
 * Builds a user-facing message from timing upload error `extra` only.
 * The global interceptor already shows `message`; this must not repeat it.
 */
export function buildTimingUploadExtraMessage(
  extra: unknown,
  translate: TranslateService
): string | null {
  if (!isRecord(extra)) return null;
  const lines = buildResultDictDetailLines(extra, translate);
  return lines.length ? lines.join('\n') : null;
}

/** Multiline description for the success banner (200 `TimingUploadOut` — ResultDict fields only). */
export function buildTimingUploadSuccessDescription(
  out: RecitationTimingUploadOut,
  translate: TranslateService
): string {
  return buildResultDictDetailLines(out as unknown as Record<string, unknown>, translate).join(
    '\n'
  );
}
