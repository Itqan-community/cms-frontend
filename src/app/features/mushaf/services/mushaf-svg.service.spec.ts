import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AyahMarker, MushafSurahMeta } from '../models/mushaf.model';
import { MushafSvgService } from './mushaf-svg.service';

/** Base CDN path for the default edition (hafs/kfqc) used in these tests. */
const SLUG = 'hafs-kfqc';
const BASE = 'https://cdn.jsdelivr.net/gh/quranpedia/quran-svg@main/mushafs/hafs/kfqc';
const SURAH_URL = `${BASE}/json/surah.json`;
const MARKERS_URL = `${BASE}/json/markers.json`;

/** Minimal surah entry — only the fields the service reads are meaningful. */
function surah(number: number, pageNumber: number, ayahCount = 5): MushafSurahMeta {
  return {
    number,
    nameArabic: `سورة ${number}`,
    nameEnglish: `Surah ${number}`,
    nameTranslation: `Surah ${number}`,
    ayahCount,
    juzNumber: 1,
    pageNumber,
    headerPosition: 0,
  };
}

function marker(page: number, ayah: number): AyahMarker {
  return { page, ayah, x: 0, y: 0 };
}

describe('MushafSvgService', () => {
  let service: MushafSvgService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MushafSvgService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MushafSvgService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getPageCount', () => {
    it('returns the highest page number across all markers', (done) => {
      service.getPageCount(SLUG).subscribe((count) => {
        expect(count).toBe(604);
        done();
      });

      httpMock.expectOne(MARKERS_URL).flush([marker(1, 1), marker(604, 6236), marker(300, 3000)]);
    });

    it('returns 0 when there are no markers', (done) => {
      service.getPageCount(SLUG).subscribe((count) => {
        expect(count).toBe(0);
        done();
      });

      httpMock.expectOne(MARKERS_URL).flush([]);
    });
  });

  describe('getSurahPageRange', () => {
    it('spans from the surah start to the page before the next surah', (done) => {
      // Surah 1 starts on page 1, surah 2 on page 2 -> surah 1 ends on page 1.
      service.getSurahPageRange(SLUG, 1).subscribe((range) => {
        expect(range).toEqual({ startPage: 1, endPage: 1 });
        done();
      });

      httpMock.expectOne(SURAH_URL).flush([surah(1, 1), surah(2, 2), surah(3, 50)]);
      httpMock.expectOne(MARKERS_URL).flush([marker(604, 6236)]);
    });

    it('spans multiple pages up to just before the next surah', (done) => {
      service.getSurahPageRange(SLUG, 2).subscribe((range) => {
        expect(range).toEqual({ startPage: 2, endPage: 49 });
        done();
      });

      httpMock.expectOne(SURAH_URL).flush([surah(1, 1), surah(2, 2), surah(3, 50)]);
      httpMock.expectOne(MARKERS_URL).flush([marker(604, 6236)]);
    });

    it('runs the last surah to the final mushaf page (from markers)', (done) => {
      service.getSurahPageRange(SLUG, 3).subscribe((range) => {
        expect(range).toEqual({ startPage: 50, endPage: 604 });
        done();
      });

      httpMock.expectOne(SURAH_URL).flush([surah(1, 1), surah(2, 2), surah(3, 50)]);
      httpMock.expectOne(MARKERS_URL).flush([marker(300, 3000), marker(604, 6236)]);
    });

    it('orders surahs by number before computing the range', (done) => {
      // Provide surahs out of order; the range for surah 2 must still be 2..49.
      service.getSurahPageRange(SLUG, 2).subscribe((range) => {
        expect(range).toEqual({ startPage: 2, endPage: 49 });
        done();
      });

      httpMock.expectOne(SURAH_URL).flush([surah(3, 50), surah(1, 1), surah(2, 2)]);
      httpMock.expectOne(MARKERS_URL).flush([marker(604, 6236)]);
    });

    it('never returns an endPage before the startPage when the next surah shares a page', (done) => {
      // Surah 2 and 3 both start on page 5 -> endPage clamps to startPage (5).
      service.getSurahPageRange(SLUG, 2).subscribe((range) => {
        expect(range).toEqual({ startPage: 5, endPage: 5 });
        done();
      });

      httpMock.expectOne(SURAH_URL).flush([surah(1, 1), surah(2, 5), surah(3, 5)]);
      httpMock.expectOne(MARKERS_URL).flush([marker(604, 6236)]);
    });

    it('returns null for an unknown surah id', (done) => {
      service.getSurahPageRange(SLUG, 999).subscribe((range) => {
        expect(range).toBeNull();
        done();
      });

      httpMock.expectOne(SURAH_URL).flush([surah(1, 1), surah(2, 2)]);
      httpMock.expectOne(MARKERS_URL).flush([marker(604, 6236)]);
    });
  });
});
