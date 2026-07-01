import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, combineLatest, map, shareReplay } from 'rxjs';
import { findMushafEdition } from '../data/mushaf-editions';
import { AyahMarker, MushafSurahMeta } from '../models/mushaf.model';

const CDN_ROOT = 'https://cdn.jsdelivr.net/gh/quranpedia/quran-svg@main/mushafs';

/**
 * Fetches quranpedia quran-svg assets (per-page SVG + surah index) directly
 * from the jsDelivr CDN. Per-edition metadata is cached in-memory.
 */
@Injectable({
  providedIn: 'root',
})
export class MushafSvgService {
  private readonly http = inject(HttpClient);

  private readonly surahsCache = new Map<string, Observable<MushafSurahMeta[]>>();
  private readonly markersCache = new Map<string, Observable<AyahMarker[]>>();
  private readonly pageSvgCache = new Map<string, Observable<string>>();

  /** Base CDN path for an edition slug, e.g. `${CDN_ROOT}/hafs/kfqc`. */
  private base(slug: string): string {
    const edition = findMushafEdition(slug);
    if (!edition) {
      throw new Error(`Unknown mushaf edition: ${slug}`);
    }
    return `${CDN_ROOT}/${edition.qiraa}/${edition.publisher}`;
  }

  /** Zero-pad a page number to 3 digits, e.g. 7 -> "007". */
  private padPage(page: number): string {
    return String(page).padStart(3, '0');
  }

  /** Surah index for an edition (cached). */
  getSurahs(slug: string): Observable<MushafSurahMeta[]> {
    const cached = this.surahsCache.get(slug);
    if (cached) return cached;

    const request = this.http
      .get<MushafSurahMeta[]>(`${this.base(slug)}/json/surah.json`)
      .pipe(shareReplay(1));
    this.surahsCache.set(slug, request);
    return request;
  }

  /** Resolve the mushaf page on which a surah starts. */
  getSurahStartPage(slug: string, suraId: number): Observable<number | null> {
    return this.getSurahs(slug).pipe(
      map((surahs) => surahs.find((s) => s.number === suraId)?.pageNumber ?? null)
    );
  }

  /** Ayah-center markers for an edition (cached). `ayah` is the global index. */
  getMarkers(slug: string): Observable<AyahMarker[]> {
    const cached = this.markersCache.get(slug);
    if (cached) return cached;

    const request = this.http
      .get<AyahMarker[]>(`${this.base(slug)}/json/markers.json`)
      .pipe(shareReplay(1));
    this.markersCache.set(slug, request);
    return request;
  }

  /**
   * Resolve the mushaf page that contains `surah:ayah` for an edition, by
   * converting to a global ayah index (cumulative ayahCount) and looking it up
   * in markers.json.
   */
  resolvePage(slug: string, suraId: number, ayahNumber: number): Observable<number | null> {
    return combineLatest([this.getSurahs(slug), this.getMarkers(slug)]).pipe(
      map(([surahs, markers]) => {
        const ordered = [...surahs].sort((a, b) => a.number - b.number);
        let globalIndex = 0;
        for (const s of ordered) {
          if (s.number === suraId) {
            if (ayahNumber < 1 || ayahNumber > s.ayahCount) return null;
            globalIndex += ayahNumber;
            break;
          }
          globalIndex += s.ayahCount;
        }
        if (globalIndex === 0) return null;
        return markers.find((m) => m.ayah === globalIndex)?.page ?? null;
      })
    );
  }

  /** Raw SVG text for a page (cached). */
  getPageSvg(slug: string, page: number): Observable<string> {
    const key = `${slug}:${page}`;
    const cached = this.pageSvgCache.get(key);
    if (cached) return cached;

    const request = this.http
      .get(`${this.base(slug)}/svg/${this.padPage(page)}.svg`, { responseType: 'text' })
      .pipe(shareReplay(1));
    this.pageSvgCache.set(key, request);
    return request;
  }

  /** Convenience: surah metadata for one surah in an edition. */
  getSurahMeta(slug: string, suraId: number): Observable<MushafSurahMeta | null> {
    return this.getSurahs(slug).pipe(map((s) => s.find((x) => x.number === suraId) ?? null));
  }

  /** Drop cached data for an edition (e.g. on hard refresh). */
  clearCache(slug?: string): void {
    if (!slug) {
      this.surahsCache.clear();
      this.markersCache.clear();
      this.pageSvgCache.clear();
      return;
    }
    this.surahsCache.delete(slug);
    this.markersCache.delete(slug);
    for (const key of [...this.pageSvgCache.keys()]) {
      if (key.startsWith(`${slug}:`)) this.pageSvgCache.delete(key);
    }
  }
}
