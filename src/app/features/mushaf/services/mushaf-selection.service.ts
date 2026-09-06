import { Injectable, signal } from '@angular/core';
import { DEFAULT_MUSHAF_EDITION, findMushafEdition } from '../data/mushaf-editions';
import { MushafEdition } from '../models/mushaf.model';

const STORAGE_KEY = 'mushaf_edition_slug';

/**
 * Holds the currently-selected mushaf edition. The slug is mirrored in the URL
 * (`?mushaf=<slug>`) by the pages; this service is the persisted source of
 * truth and the localStorage-backed default.
 */
@Injectable({
  providedIn: 'root',
})
export class MushafSelectionService {
  private readonly selectedSignal = signal<MushafEdition>(this.readInitial());

  readonly selected = this.selectedSignal.asReadonly();

  private readInitial(): MushafEdition {
    return findMushafEdition(this.readStoredSlug()) ?? DEFAULT_MUSHAF_EDITION;
  }

  private readStoredSlug(): string | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  /**
   * Select by slug. Missing/unknown slugs keep the current edition and do not
   * overwrite localStorage (so `/mushaf` without `?mushaf=` keeps the stored qiraa).
   */
  select(slug: string | null | undefined): MushafEdition {
    const found = findMushafEdition(slug);
    if (!found) {
      return this.selectedSignal();
    }
    this.selectedSignal.set(found);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, found.slug);
      }
    } catch {
      // Private mode / blocked storage — in-memory selection still applies.
    }
    return found;
  }
}
