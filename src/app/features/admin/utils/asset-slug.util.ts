import { Validators } from '@angular/forms';

/** Lowercase words joined by single hyphens, e.g. `tafsir-ibn-kathir` (the backend also checks the prefix). */
export const ASSET_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Create forms require the package slug the Translate button fills (or the admin types on AI failure). */
export const assetSlugValidators = [
  Validators.required,
  Validators.maxLength(50),
  Validators.pattern(ASSET_SLUG_PATTERN),
];
