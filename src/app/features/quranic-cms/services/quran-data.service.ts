import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, map, shareReplay, tap } from 'rxjs';
import { SURAHS_METADATA, JUZ_PAGE_MAPPING, SurahMetadata } from '../models/quran-metadata';

export interface AyahMarker {
  line: number;
  centerX: number;
  centerY: number;
  numberCodePoint: string;
}

export interface AyahHighlight {
  line: number;
  left: number;
  right: number;
}

export interface AyahData {
  id: number;
  chapter: number;
  number: number;
  text: string;
  textWithoutTashkil: string;
  searchableText: string;
  marker1441?: AyahMarker;
  highlights1441?: AyahHighlight[];
}

export interface EnrichedAyah extends AyahData {
  page_number: number;
  surah_name: string;
}

export interface QuranDataJson {
  pages: Record<string, AyahData[]>;
}

export interface QuranPage {
  page_number: number;
  juz_number: number;
  surahs: string[];
}

export interface QuranWord {
  id: number;
  text_uthmani: string;
  text_spelling: string;
  surah_name: string;
  surah_id: number;
  ayah_id: number;
  position: number;
}

export interface SurahStats {
  surah_number: number;
  name_ar: string;
  name_en: string;
  ayahs_count: number;
  revelation_type: 'meccan' | 'medinan';
}

@Injectable({
  providedIn: 'root',
})
export class QuranDataService {
  private http = inject(HttpClient);

  // Using assets path relative to the app root.
  // We use HttpClient even for local files in Angular because assets are served by the web server
  // and must be fetched asynchronously to avoid bundling large data into the main JS payload.
  private readonly JSON_PATH = 'assets/data/quraan_data.json';
  private dataSubject = new BehaviorSubject<QuranDataJson | null>(null);

  // Cache the processed data to avoid re-calculating large sets
  private pagesCache: QuranPage[] = [];
  private surahsCache: SurahStats[] = [];

  constructor() {
    this.loadData();
  }

  private loadData(): void {
    this.http
      .get<QuranDataJson>(this.JSON_PATH)
      .pipe(
        tap((data: QuranDataJson) => this.dataSubject.next(data)),
        shareReplay(1)
      )
      .subscribe();
  }

  getPages(): Observable<QuranPage[]> {
    return this.dataSubject.asObservable().pipe(
      map((data: QuranDataJson | null) => {
        if (!data) return [];
        if (this.pagesCache.length > 0) return this.pagesCache;

        const pages: QuranPage[] = [];
        Object.keys(data.pages).forEach((pageStr: string) => {
          const pageNum = parseInt(pageStr, 10);
          const ayahs: AyahData[] = data.pages[pageStr];

          // Find unique surah IDs on this page
          const surahIds = [...new Set(ayahs.map((a: AyahData) => a.chapter))];
          const surahNames = surahIds.map(
            (id: number) =>
              SURAHS_METADATA.find((s: SurahMetadata) => s.id === id)?.name_ar || `سورة ${id}`
          );

          // Find Juz number for this page
          let juzNum = 1;
          for (let j = 30; j >= 1; j--) {
            if (pageNum >= JUZ_PAGE_MAPPING[j]) {
              juzNum = j;
              break;
            }
          }

          pages.push({
            page_number: pageNum,
            juz_number: juzNum,
            surahs: surahNames,
          });
        });

        this.pagesCache = pages.sort((a, b) => a.page_number - b.page_number);
        return this.pagesCache;
      })
    );
  }

  getSurahs(): Observable<SurahStats[]> {
    return this.dataSubject.asObservable().pipe(
      map((data: QuranDataJson | null) => {
        if (!data) return [];
        if (this.surahsCache.length > 0) return this.surahsCache;

        // Extract Surah stats from JSON (like Ayah count)
        const allAyahs: AyahData[] = Object.values(data.pages).flat() as AyahData[];

        const surahs = SURAHS_METADATA.map((meta: SurahMetadata) => {
          const count = allAyahs.filter((a: AyahData) => a.chapter === meta.id).length;
          return {
            surah_number: meta.id,
            name_ar: meta.name_ar,
            name_en: meta.name_en,
            ayahs_count: count > 0 ? count : meta.ayahs, // Fallback to meta if not in JSON
            revelation_type: meta.type,
          };
        });

        this.surahsCache = surahs;
        return this.surahsCache;
      })
    );
  }

  getAyahs(surahId?: number): Observable<EnrichedAyah[]> {
    return this.dataSubject.asObservable().pipe(
      map((data: QuranDataJson | null) => {
        if (!data) return [];
        let allAyahs: EnrichedAyah[] = [];

        Object.keys(data.pages).forEach((pageNum: string) => {
          const pageAyahs = data.pages[pageNum].map((a: AyahData) => ({
            ...a,
            page_number: parseInt(pageNum, 10),
            surah_name:
              SURAHS_METADATA.find((s: SurahMetadata) => s.id === a.chapter)?.name_ar ||
              `سورة ${a.chapter}`,
          }));
          allAyahs = allAyahs.concat(pageAyahs);
        });

        if (surahId) {
          return allAyahs.filter((a: EnrichedAyah) => a.chapter === surahId);
        }
        return allAyahs;
      })
    );
  }

  getWords(surahId?: number): Observable<QuranWord[]> {
    return this.getAyahs(surahId).pipe(
      map((ayahs: EnrichedAyah[]) => {
        const words: QuranWord[] = [];
        let globalWordId = 1;

        ayahs.forEach((ayah: EnrichedAyah) => {
          const uthmaniWords = ayah.text.split(' ');
          const spellingWords = ayah.textWithoutTashkil.split(' ');

          uthmaniWords.forEach((word: string, index: number) => {
            words.push({
              id: globalWordId++,
              text_uthmani: word,
              text_spelling: spellingWords[index] || word,
              surah_name: ayah.surah_name,
              surah_id: ayah.chapter,
              ayah_id: ayah.number,
              position: index + 1,
            });
          });
        });

        return words;
      })
    );
  }
}
