import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, delay, map, of, shareReplay, throwError } from 'rxjs';
import { SURAHS_METADATA, SurahMetadata } from '../../models/quran-metadata';
import type {
  HierarchyAyah,
  HierarchyLetter,
  HierarchyList,
  HierarchySearchResult,
  HierarchySurah,
  HierarchyWord,
} from '../models/hierarchy.models';

const MOCK_DELAY_MS = 250;
const SEARCH_LIMIT = 20;
/** Quran text already shipped with the app (pages > ayahs); fetched once, on first use. */
const QURAN_TEXT_PATH = 'assets/data/quraan_data.json';
/** Synthetic word segments so the timing column can be exercised before real timings exist. */
const MOCK_MS_PER_LETTER = 90;
const MOCK_WORD_GAP_MS = 120;

interface QuranTextAyah {
  chapter: number;
  number: number;
  text: string;
  textWithoutTashkil: string;
}

interface QuranTextJson {
  pages: Record<string, QuranTextAyah[]>;
}

interface MockAyah {
  number: number;
  text: string;
  searchable: string;
}

type MockIndex = Map<number, MockAyah[]>;

/**
 * In-memory stand-in for `/portal/hierarchy/` until the backend ships it. Remove this file and
 * `environment.useHierarchyMockApi` once the endpoints are live.
 */
@Injectable({
  providedIn: 'root',
})
export class HierarchyMockStore {
  private readonly http = inject(HttpClient);
  private index$: Observable<MockIndex> | null = null;

  getSurahs(): Observable<HierarchyList<HierarchySurah>> {
    return withDelay(toList(SURAHS_METADATA.map(toSurah)));
  }

  getAyahs(surahNumber: number): Observable<HierarchyList<HierarchyAyah>> {
    if (!findSurah(surahNumber)) {
      return notFound();
    }
    return this.loadIndex().pipe(
      map((index) =>
        toList(
          (index.get(surahNumber) ?? []).map((ayah) => ({
            ayah_key: `${surahNumber}:${ayah.number}`,
            surah_number: surahNumber,
            ayah_number: ayah.number,
            text: ayah.text,
            words_count: splitWords(ayah.text).length,
          }))
        )
      ),
      delay(MOCK_DELAY_MS)
    );
  }

  getWords(ayahKey: string): Observable<HierarchyList<HierarchyWord>> {
    return this.findAyah(ayahKey).pipe(
      map((ayah) => {
        let cursor = 0;
        return toList(
          splitWords(ayah.text).map((text, index) => {
            const lettersCount = splitLetters(text).length;
            const start = cursor;
            const end = start + lettersCount * MOCK_MS_PER_LETTER;
            cursor = end + MOCK_WORD_GAP_MS;
            return {
              word_key: `${ayahKey}:${index + 1}`,
              ayah_key: ayahKey,
              position: index + 1,
              text,
              letters_count: lettersCount,
              start_ms: start,
              end_ms: end,
            };
          })
        );
      }),
      delay(MOCK_DELAY_MS)
    );
  }

  getLetters(wordKey: string): Observable<HierarchyList<HierarchyLetter>> {
    const parts = parseKey(wordKey, 3);
    if (!parts) {
      return notFound();
    }
    const ayahKey = `${parts[0]}:${parts[1]}`;
    return this.findAyah(ayahKey).pipe(
      map((ayah) => splitWords(ayah.text)[parts[2] - 1]),
      map((word) => {
        if (word === undefined) {
          throw notFoundError();
        }
        return toList(
          splitLetters(word).map((text, index) => ({
            letter_key: `${wordKey}:${index + 1}`,
            word_key: wordKey,
            position: index + 1,
            text,
          }))
        );
      }),
      delay(MOCK_DELAY_MS)
    );
  }

  search(query: string): Observable<HierarchyList<HierarchySearchResult>> {
    const term = toLatinDigits(query).trim();
    if (!term) {
      return withDelay(toList([]));
    }

    const ayahKey = /^(\d{1,3})\s*:\s*(\d{1,3})$/.exec(term);
    if (ayahKey) {
      const surah = findSurah(Number(ayahKey[1]));
      const ayahNumber = Number(ayahKey[2]);
      if (!surah || ayahNumber < 1 || ayahNumber > surah.ayahs) {
        return withDelay(toList([]));
      }
      return this.loadIndex().pipe(
        map((index) => {
          const ayah = index.get(surah.id)?.find((item) => item.number === ayahNumber);
          return toList(ayah ? [toAyahResult(surah, ayah)] : []);
        }),
        delay(MOCK_DELAY_MS)
      );
    }

    if (/^\d{1,3}$/.test(term)) {
      const surah = findSurah(Number(term));
      return withDelay(toList(surah ? [toSurahResult(surah)] : []));
    }

    const compactTerm = normalize(term).replace(/\s/g, '');
    const surahHits = SURAHS_METADATA.filter((surah) =>
      [surah.name_ar, surah.name_en].some((name) =>
        normalize(name).replace(/\s/g, '').includes(compactTerm)
      )
    ).map(toSurahResult);

    if (!/\p{Script=Arabic}/u.test(term)) {
      return withDelay(limit(surahHits));
    }

    const textTerm = normalize(term);
    return this.loadIndex().pipe(
      map((index) => {
        const ayahHits: HierarchySearchResult[] = [];
        for (const surah of SURAHS_METADATA) {
          for (const ayah of index.get(surah.id) ?? []) {
            if (ayah.searchable.includes(textTerm)) {
              ayahHits.push(toAyahResult(surah, ayah));
            }
          }
        }
        return limit([...surahHits, ...ayahHits]);
      }),
      delay(MOCK_DELAY_MS)
    );
  }

  private findAyah(ayahKey: string): Observable<MockAyah> {
    const parts = parseKey(ayahKey, 2);
    if (!parts || !findSurah(parts[0])) {
      return notFound();
    }
    return this.loadIndex().pipe(
      map((index) => {
        const ayah = index.get(parts[0])?.find((item) => item.number === parts[1]);
        if (!ayah) {
          throw notFoundError();
        }
        return ayah;
      })
    );
  }

  private loadIndex(): Observable<MockIndex> {
    if (!this.index$) {
      this.index$ = this.http.get<QuranTextJson>(QURAN_TEXT_PATH).pipe(
        map(buildIndex),
        catchError((error: unknown) => {
          this.index$ = null;
          return throwError(() => error);
        }),
        shareReplay(1)
      );
    }
    return this.index$;
  }
}

function buildIndex(data: QuranTextJson): MockIndex {
  const index: MockIndex = new Map();
  for (const ayahs of Object.values(data.pages)) {
    for (const ayah of ayahs) {
      const list = index.get(ayah.chapter) ?? [];
      list.push({
        number: ayah.number,
        text: ayah.text,
        searchable: normalize(ayah.textWithoutTashkil),
      });
      index.set(ayah.chapter, list);
    }
  }
  index.forEach((list) => list.sort((a, b) => a.number - b.number));
  return index;
}

function toSurah(meta: SurahMetadata): HierarchySurah {
  return {
    surah_number: meta.id,
    name_ar: meta.name_ar,
    name_en: meta.name_en,
    revelation_type: meta.type,
    ayahs_count: meta.ayahs,
  };
}

function toSurahResult(meta: SurahMetadata): HierarchySearchResult {
  return {
    level: 'surah',
    surah_number: meta.id,
    surah_name_ar: meta.name_ar,
    surah_name_en: meta.name_en,
    ayah_key: null,
    ayah_number: null,
    text: null,
  };
}

function toAyahResult(meta: SurahMetadata, ayah: MockAyah): HierarchySearchResult {
  return {
    level: 'ayah',
    surah_number: meta.id,
    surah_name_ar: meta.name_ar,
    surah_name_en: meta.name_en,
    ayah_key: `${meta.id}:${ayah.number}`,
    ayah_number: ayah.number,
    text: ayah.text,
  };
}

function findSurah(surahNumber: number): SurahMetadata | undefined {
  return SURAHS_METADATA.find((surah) => surah.id === surahNumber);
}

function parseKey(key: string, size: number): number[] | null {
  const parts = key.split(':').map(Number);
  return parts.length === size && parts.every((part) => Number.isInteger(part) && part > 0)
    ? parts
    : null;
}

function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** A letter is one base character together with the marks (diacritics) that follow it. */
function splitLetters(word: string): string[] {
  return word.match(/\P{M}\p{M}*/gu) ?? [];
}

function toLatinDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660));
}

function normalize(value: string): string {
  return value
    .replace(/\p{M}/gu, '')
    .replace(/ـ/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function toList<T>(results: T[]): HierarchyList<T> {
  return { results, count: results.length };
}

function limit(results: HierarchySearchResult[]): HierarchyList<HierarchySearchResult> {
  return { results: results.slice(0, SEARCH_LIMIT), count: results.length };
}

function withDelay<T>(value: T): Observable<T> {
  return of(value).pipe(delay(MOCK_DELAY_MS));
}

function notFoundError(): HttpErrorResponse {
  return new HttpErrorResponse({
    status: 404,
    statusText: 'Not Found',
    error: { error_name: 'not_found', message: 'Not found' },
  });
}

function notFound<T>(): Observable<T> {
  return throwError(() => notFoundError());
}
