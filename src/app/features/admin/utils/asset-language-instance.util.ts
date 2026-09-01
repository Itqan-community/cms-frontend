import type { AssetLanguageInstance } from '../models/asset-language-instance.models';

export function isLanguageInstanceVisible(
  instance: Pick<AssetLanguageInstance, 'is_visible'>
): boolean {
  return instance.is_visible !== false;
}

export function canDeleteLanguageInstance(instance: AssetLanguageInstance): boolean {
  return !instance.is_default;
}

export function canHideLanguageInstance(instance: AssetLanguageInstance): boolean {
  return !instance.is_default;
}

export function canSetLanguageAsDefault(
  instance: Pick<AssetLanguageInstance, 'is_default' | 'is_visible'>
): boolean {
  return !instance.is_default && isLanguageInstanceVisible(instance);
}

export function languageInstanceLabel(instance: AssetLanguageInstance, locale: string): string {
  if (locale === 'ar' && instance.language_code === 'ar') {
    return instance.name || 'العربية';
  }
  return instance.name || instance.language_code.toUpperCase();
}
