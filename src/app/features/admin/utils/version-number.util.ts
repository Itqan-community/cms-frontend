import type { ValidatorFn } from '@angular/forms';
import type { VersionBump } from '../models/asset-versions.models';

/** Tafsir/translation version numbers are "major.minor" (e.g. "7.0"). */
const VERSION_NUMBER = /^\d{1,9}\.\d{1,9}$/;

export function isVersionNumber(value: string | null | undefined): boolean {
  return VERSION_NUMBER.test((value ?? '').trim());
}

/** The number the server issues after `latest` — mirrors the backend rule. */
export function nextVersionNumber(latest: string, bump: VersionBump): string | null {
  if (!isVersionNumber(latest)) return null;
  const [major, minor] = latest.trim().split('.').map(Number);
  return bump === 'major' ? `${major + 1}.0` : `${major}.${minor + 1}`;
}

/** Blank passes (pair with `Validators.required` when the number is mandatory). */
export const versionNumberValidator: ValidatorFn = (control) =>
  !String(control.value ?? '').trim() || isVersionNumber(control.value)
    ? null
    : { versionNumber: true };
