import {
  AbstractControl,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { SURAHS_METADATA } from '../../models/quran-metadata';
import { IssueReportContext } from '../models/issues.models';

/** Which location fields an asset category takes (mirrors the backend's per-category schemas). */
export type IssueContextKind = 'ayah' | 'page' | 'font';

export function issueContextKind(category: string | null | undefined): IssueContextKind | null {
  switch (category) {
    case 'recitation':
    case 'text':
      return 'ayah';
    case 'mushaf':
      return 'page';
    case 'font':
      return 'font';
    default:
      return null;
  }
}

/** The backend's glyph length limit. */
export const GLYPH_MAX_LENGTH = 32;

export type IssueContextForm = FormGroup<{
  surah: FormControl<number | null>;
  ayah: FormControl<number | null>;
  page: FormControl<number | null>;
  glyph: FormControl<string>;
}>;

export function createIssueContextForm(): IssueContextForm {
  return new FormGroup({
    surah: new FormControl<number | null>(null),
    ayah: new FormControl<number | null>(null),
    page: new FormControl<number | null>(null),
    glyph: new FormControl<string>('', { nonNullable: true }),
  });
}

/** A font report needs a page, a glyph, or both. */
export function pageOrGlyphValidator(group: AbstractControl): ValidationErrors | null {
  const { page, glyph } = (group as IssueContextForm).getRawValue();
  return page != null || glyph.trim() ? null : { pageOrGlyph: true };
}

/**
 * Make `kind`'s fields required (or, with `required` false, all optional): surah and ayah for
 * recitation / text, page for mushaf, page or glyph for font. Clears the other kinds' rules,
 * so call it whenever the asset (and so the kind) changes.
 */
export function setIssueContextRequired(
  kind: IssueContextKind | null,
  form: IssueContextForm,
  required = true
): void {
  const { surah, ayah, page } = form.controls;
  [surah, ayah, page].forEach((control) => control.clearValidators());
  form.clearValidators();
  if (required && kind === 'ayah') {
    surah.setValidators(Validators.required);
    ayah.setValidators(Validators.required);
  }
  if (required && kind === 'page') page.setValidators(Validators.required);
  if (required && kind === 'font') form.setValidators(pageOrGlyphValidator);
  [surah, ayah, page].forEach((control) => control.updateValueAndValidity({ emitEvent: false }));
  form.updateValueAndValidity({ emitEvent: false });
}

/** Show every field's error, e.g. after a blocked submit. */
export function markIssueContextTouched(form: IssueContextForm): void {
  Object.values(form.controls).forEach((control) => {
    control.markAsDirty();
    control.markAsTouched();
    control.updateValueAndValidity({ onlySelf: true });
  });
  form.markAsTouched();
  form.updateValueAndValidity();
}

/** The context to send for `kind`: only that kind's filled-in fields; null when none is filled. */
export function issueContextFromForm(
  kind: IssueContextKind | null,
  form: IssueContextForm
): IssueReportContext | null {
  const { surah, ayah, page, glyph } = form.getRawValue();
  const context: IssueReportContext = {};
  if (kind === 'ayah' && surah != null) {
    context.surah = surah;
    if (ayah != null) context.ayah = ayah;
  }
  if ((kind === 'page' || kind === 'font') && page != null) context.page = page;
  if (kind === 'font' && glyph.trim()) context.glyph = glyph.trim();
  return Object.keys(context).length ? context : null;
}

export interface IssueContextTranslator {
  instant(key: string, params?: Record<string, unknown>): string;
  readonly currentLang?: string;
}

/**
 * The context in words — "Al-Baqarah 2:255", "Page 12", "Page 3 · Glyph “ب”" — in the UI
 * language; empty when there is none. Same wording as the backend's `context_label`.
 */
export function formatIssueContext(
  context: IssueReportContext | null | undefined,
  translate: IssueContextTranslator
): string {
  if (!context) return '';
  const parts: string[] = [];
  const surah = context.surah != null ? SURAHS_METADATA[context.surah - 1] : undefined;
  if (surah && surah.id === context.surah) {
    const name = translate.currentLang === 'ar' ? surah.name_ar : surah.name_en;
    parts.push(
      context.ayah != null ? `${name} ${surah.id}:${context.ayah}` : `${name} (${surah.id})`
    );
  }
  if (context.page != null) {
    parts.push(translate.instant('ISSUE_CONTEXT.PAGE_VALUE', { page: context.page }));
  }
  if (context.glyph) {
    parts.push(translate.instant('ISSUE_CONTEXT.GLYPH_VALUE', { glyph: context.glyph }));
  }
  return parts.join(' · ');
}
