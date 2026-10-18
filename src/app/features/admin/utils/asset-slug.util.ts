import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

/** Lowercase words joined by single hyphens, e.g. `tafsir-ibn-kathir`. */
export const ASSET_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The identifier must start with its asset type (`tafsir-…`), as the backend requires. */
function assetSlugPrefix(category: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value ?? '');
    if (!value || value === category || value.startsWith(`${category}-`)) return null;
    return { assetSlugPrefix: { category } };
  };
}

/** Create forms require the identifier the Translate button fills (or the admin types on AI failure). */
export function assetSlugValidators(category: string): ValidatorFn[] {
  return [
    Validators.required,
    Validators.maxLength(50),
    Validators.pattern(ASSET_SLUG_PATTERN),
    assetSlugPrefix(category),
  ];
}
