import { Injectable } from '@angular/core';

import type { AssetVersionParentKind } from '../models/asset-versions.models';

/**
 * Remembers the last language a user was viewing/editing for a given asset, so
 * navigating from the asset detail into the content editor and back keeps the
 * same language active instead of snapping back to the source language.
 *
 * Backed by sessionStorage so the choice also survives a full page reload within
 * the tab; failures (private mode, disabled storage) degrade to no-ops.
 */
@Injectable({ providedIn: 'root' })
export class LastActiveLanguageService {
  private key(kind: AssetVersionParentKind, slug: string): string {
    return `cms:last-language:${kind}:${slug}`;
  }

  get(kind: AssetVersionParentKind, slug: string): string | null {
    try {
      return sessionStorage.getItem(this.key(kind, slug));
    } catch {
      return null;
    }
  }

  set(kind: AssetVersionParentKind, slug: string, language: string): void {
    try {
      sessionStorage.setItem(this.key(kind, slug), language);
    } catch {
      // Ignore storage failures (private mode / quota); language just won't persist.
    }
  }
}
