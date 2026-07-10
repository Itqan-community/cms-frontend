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
    const stored = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    return findMushafEdition(stored) ?? DEFAULT_MUSHAF_EDITION;
  }

  /** Select by slug; falls back to the default for an unknown slug. */
  select(slug: string | null | undefined): MushafEdition {
    const edition = findMushafEdition(slug) ?? DEFAULT_MUSHAF_EDITION;
    this.selectedSignal.set(edition);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, edition.slug);
    }
    return edition;
  }
}
