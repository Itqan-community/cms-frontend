import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import {
  HierarchyAyah,
  HierarchyLetter,
  HierarchyList,
  HierarchySearchResult,
  HierarchySurah,
  HierarchyWord,
} from '../models/hierarchy.models';
import { HierarchyService } from './hierarchy.service';

const MOCK_DELAY_MS = 250;
const TEXT_URL = 'assets/data/quraan_data.json';

/** A slice of the bundled Quran text: Al-Fatihah 1 to 3 and Al-Baqarah 1. */
const QURAN_TEXT = {
  pages: {
    '1': [
      {
        chapter: 1,
        number: 2,
        text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
        textWithoutTashkil: 'الحمد لله رب العالمين',
      },
      {
        chapter: 1,
        number: 1,
        text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        textWithoutTashkil: 'بسم الله الرحمن الرحيم',
      },
      {
        chapter: 1,
        number: 3,
        text: 'الرَّحْمَٰنِ الرَّحِيمِ',
        textWithoutTashkil: 'الرحمن الرحيم',
      },
    ],
    '2': [{ chapter: 2, number: 1, text: 'الم', textWithoutTashkil: 'الم' }],
  },
};

describe('HierarchyService', () => {
  let service: HierarchyService;
  let httpMock: HttpTestingController;
  const useMock = environment.useHierarchyMockApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(HierarchyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    environment.useHierarchyMockApi = useMock;
    httpMock.verify();
  });

  describe('with the mock API', () => {
    beforeEach(() => {
      environment.useHierarchyMockApi = true;
    });

    it('lists the 114 surahs with 6236 ayahs in total without any request', fakeAsync(() => {
      // Arrange
      let received: HierarchyList<HierarchySurah> | null = null;

      // Act
      service.getSurahs().subscribe((list) => (received = list));
      tick(MOCK_DELAY_MS);

      // Assert
      const list = received as unknown as HierarchyList<HierarchySurah>;
      expect(list.count).toBe(114);
      expect(list.results.reduce((sum, surah) => sum + surah.ayahs_count, 0)).toBe(6236);
      expect(list.results[1]).toEqual({
        surah_number: 2,
        name_ar: 'البقرة',
        name_en: 'Al-Baqarah',
        revelation_type: 'medinan',
        ayahs_count: 286,
      });
      httpMock.expectNone(TEXT_URL);
    }));

    it('loads the bundled text only when ayahs are first asked for, then reuses it', fakeAsync(() => {
      // Arrange
      let ayahs: HierarchyAyah[] = [];
      let words: HierarchyWord[] = [];

      // Act
      service.getAyahs(1).subscribe((list) => (ayahs = list.results));
      httpMock.expectOne(TEXT_URL).flush(QURAN_TEXT);
      tick(MOCK_DELAY_MS);
      service.getWords('1:1').subscribe((list) => (words = list.results));
      tick(MOCK_DELAY_MS);

      // Assert: ayahs in order, keyed `surah:ayah`, and the second call made no request
      expect(ayahs.map((ayah) => ayah.ayah_key)).toEqual(['1:1', '1:2', '1:3']);
      expect(ayahs[0].words_count).toBe(4);
      expect(words.length).toBe(4);
      httpMock.expectNone(TEXT_URL);
    }));

    it('returns the words of an ayah with positions, letter counts and ordered timings', fakeAsync(() => {
      // Arrange
      let words: HierarchyWord[] = [];

      // Act
      service.getWords('1:1').subscribe((list) => (words = list.results));
      httpMock.expectOne(TEXT_URL).flush(QURAN_TEXT);
      tick(MOCK_DELAY_MS);

      // Assert
      expect(words.map((word) => word.word_key)).toEqual(['1:1:1', '1:1:2', '1:1:3', '1:1:4']);
      expect(words[0]).toEqual(
        jasmine.objectContaining({ ayah_key: '1:1', position: 1, text: 'بِسْمِ', letters_count: 3 })
      );
      words.forEach((word, index) => {
        expect(word.end_ms!).toBeGreaterThan(word.start_ms!);
        if (index > 0) {
          expect(word.start_ms!).toBeGreaterThan(words[index - 1].end_ms!);
        }
      });
    }));

    it('splits a word into base letters that keep their diacritics', fakeAsync(() => {
      // Arrange
      let letters: HierarchyLetter[] = [];

      // Act
      service.getLetters('1:1:1').subscribe((list) => (letters = list.results));
      httpMock.expectOne(TEXT_URL).flush(QURAN_TEXT);
      tick(MOCK_DELAY_MS);

      // Assert
      expect(letters).toEqual([
        { letter_key: '1:1:1:1', word_key: '1:1:1', position: 1, text: 'بِ' },
        { letter_key: '1:1:1:2', word_key: '1:1:1', position: 2, text: 'سْ' },
        { letter_key: '1:1:1:3', word_key: '1:1:1', position: 3, text: 'مِ' },
      ]);
    }));

    it('answers 404 for a surah that does not exist, without loading the text', fakeAsync(() => {
      // Arrange
      let status = 0;

      // Act
      service.getAyahs(115).subscribe({ error: (error) => (status = error.status) });
      tick(MOCK_DELAY_MS);

      // Assert
      expect(status).toBe(404);
      httpMock.expectNone(TEXT_URL);
    }));

    it('answers 404 for a word past the end of its ayah', fakeAsync(() => {
      // Arrange
      let status = 0;

      // Act
      service.getLetters('1:1:9').subscribe({ error: (error) => (status = error.status) });
      httpMock.expectOne(TEXT_URL).flush(QURAN_TEXT);
      tick(MOCK_DELAY_MS);

      // Assert
      expect(status).toBe(404);
    }));

    it('retries the text download after a failed attempt instead of caching the error', fakeAsync(() => {
      // Arrange
      let failed = false;
      let ayahs: HierarchyAyah[] = [];

      // Act
      service.getAyahs(2).subscribe({ error: () => (failed = true) });
      httpMock.expectOne(TEXT_URL).flush('boom', { status: 500, statusText: 'Server Error' });
      service.getAyahs(2).subscribe((list) => (ayahs = list.results));
      httpMock.expectOne(TEXT_URL).flush(QURAN_TEXT);
      tick(MOCK_DELAY_MS);

      // Assert
      expect(failed).toBeTrue();
      expect(ayahs.map((ayah) => ayah.ayah_key)).toEqual(['2:1']);
    }));

    describe('search', () => {
      function search(query: string, flushText = false): HierarchyList<HierarchySearchResult> {
        let received: HierarchyList<HierarchySearchResult> | null = null;
        service.search(query).subscribe((list) => (received = list));
        if (flushText) {
          httpMock.expectOne(TEXT_URL).flush(QURAN_TEXT);
        }
        tick(MOCK_DELAY_MS);
        return received as unknown as HierarchyList<HierarchySearchResult>;
      }

      it('finds a surah by number, in Latin or Arabic digits', fakeAsync(() => {
        expect(search('2').results.map((r) => [r.level, r.surah_number])).toEqual([['surah', 2]]);
        expect(search('١١٤').results.map((r) => r.surah_name_en)).toEqual(['An-Nas']);
        httpMock.expectNone(TEXT_URL);
      }));

      it('finds surahs by Arabic or English name, ignoring diacritics and punctuation', fakeAsync(() => {
        expect(search('baqara').results.map((r) => r.surah_number)).toEqual([2]);
        expect(search('imran').results.map((r) => r.surah_number)).toEqual([3]);
        expect(search('البقرة', true).results[0].surah_number).toBe(2);
      }));

      it('resolves an ayah key to that ayah', fakeAsync(() => {
        // Act
        const list = search('1:2', true);

        // Assert
        expect(list.results).toEqual([
          {
            level: 'ayah',
            surah_number: 1,
            surah_name_ar: 'الفاتحة',
            surah_name_en: 'Al-Fatihah',
            ayah_key: '1:2',
            ayah_number: 2,
            text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
          },
        ]);
      }));

      it('returns nothing for an ayah key past the end of the surah', fakeAsync(() => {
        expect(search('1:8').count).toBe(0);
        httpMock.expectNone(TEXT_URL);
      }));

      it('matches ayah text with or without diacritics', fakeAsync(() => {
        expect(search('الرَّحِيمِ', true).results.map((r) => r.ayah_key)).toEqual(['1:1', '1:3']);
      }));

      it('returns an empty list for a blank query', fakeAsync(() => {
        expect(search('   ')).toEqual({ results: [], count: 0 });
      }));
    });
  });

  describe('with the portal API', () => {
    beforeEach(() => {
      environment.useHierarchyMockApi = false;
    });

    it('requests each level from its own portal endpoint', () => {
      // Arrange
      const base = `${environment.ADMIN_API_BASE_URL}/hierarchy/`;
      const empty = { results: [], count: 0 };

      // Act
      service.getSurahs().subscribe();
      service.getAyahs(2).subscribe();
      service.getWords('2:255').subscribe();
      service.getLetters('2:255:3').subscribe();

      // Assert
      const paths = ['surahs/', 'surahs/2/ayahs/', 'ayahs/2:255/words/', 'words/2:255:3/letters/'];
      paths.forEach((path) => {
        const req = httpMock.expectOne(`${base}${path}`);
        expect(req.request.method).toBe('GET');
        req.flush(empty);
      });
      httpMock.expectNone(TEXT_URL);
    });

    it('sends the search text as the q parameter', () => {
      // Act
      service.search('2:255').subscribe();

      // Assert
      const req = httpMock.expectOne(
        (r) => r.url === `${environment.ADMIN_API_BASE_URL}/hierarchy/search/`
      );
      expect(req.request.params.get('q')).toBe('2:255');
      req.flush({ results: [], count: 0 });
    });
  });
});
