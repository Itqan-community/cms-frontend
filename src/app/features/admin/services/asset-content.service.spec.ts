import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { isGroupTemplate } from '../models/asset-content.models';
import { AssetContentService } from './asset-content.service';

describe('AssetContentService columns', () => {
  let service: AssetContentService;
  let httpMock: HttpTestingController;
  const base = `${environment.ADMIN_API_BASE_URL}/content/tafsirs/ayah-qa/columns/`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AssetContentService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AssetContentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists the columns', () => {
    service.listColumns('tafsir', 'ayah-qa').subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('creates a column with its key and labels', () => {
    service
      .createColumn('tafsir', 'ayah-qa', { key: 'answer', label_en: 'Answer', label_ar: 'الجواب' })
      .subscribe();
    const req = httpMock.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ key: 'answer', label_en: 'Answer', label_ar: 'الجواب' });
    req.flush({});
  });

  it('updates a column by its encoded key', () => {
    service.updateColumn('tafsir', 'ayah-qa', 'answer', { label_ar: 'ج' }).subscribe();
    const req = httpMock.expectOne(`${base}answer/`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ label_ar: 'ج' });
    req.flush({});
  });

  it('reorders columns', () => {
    service.reorderColumns('tafsir', 'ayah-qa', ['answer', 'question']).subscribe();
    const req = httpMock.expectOne(`${base}order/`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ keys: ['answer', 'question'] });
    req.flush([]);
  });

  it('deletes a column', () => {
    service.deleteColumn('tafsir', 'ayah-qa', 'answer').subscribe();
    const req = httpMock.expectOne(`${base}answer/`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});

describe('AssetContentService groups', () => {
  let service: AssetContentService;
  let httpMock: HttpTestingController;
  const versionBase = `${environment.ADMIN_API_BASE_URL}/content/tafsirs/grouped/versions/7/`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AssetContentService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AssetContentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds a group with its range and first text', () => {
    service
      .addGroup(
        'tafsir',
        'grouped',
        7,
        { surah: 2, ayah: 1 },
        { surah: 2, ayah: 5 },
        { text: 'commentary' }
      )
      .subscribe();
    const req = httpMock.expectOne(`${versionBase}groups/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      start: { surah: 2, ayah: 1 },
      end: { surah: 2, ayah: 5 },
      cells: { text: 'commentary' },
    });
    req.flush([]);
  });

  it('moves a group by its unit id', () => {
    service
      .moveGroup('tafsir', 'grouped', 7, 2000005, { surah: 2, ayah: 2 }, { surah: 2, ayah: 6 })
      .subscribe();
    const req = httpMock.expectOne(`${versionBase}groups/2000005/`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ start: { surah: 2, ayah: 2 }, end: { surah: 2, ayah: 6 } });
    req.flush([]);
  });

  it('appends the next group', () => {
    service.appendGroup('tafsir', 'grouped', 7).subscribe();
    const req = httpMock.expectOne(`${versionBase}groups/next/`);
    expect(req.request.method).toBe('POST');
    req.flush([]);
  });

  it('grows or shrinks a group by one step', () => {
    service.extendGroup('tafsir', 'grouped', 7, 2000005, -1).subscribe();
    const req = httpMock.expectOne(`${versionBase}groups/2000005/extend/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ by: -1 });
    req.flush([]);
  });

  it('deletes a group by its unit id', () => {
    service.deleteGroup('tafsir', 'grouped', 7, 2000005).subscribe();
    const req = httpMock.expectOne(`${versionBase}groups/2000005/`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('previews an ayah range without word params', () => {
    service.quranRange({ surah: 1, ayah: 1 }, { surah: 1, ayah: 3 }).subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === `${environment.ADMIN_API_BASE_URL}/content/quran-range/`
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('from_surah')).toBe('1');
    expect(req.request.params.get('to_ayah')).toBe('3');
    expect(req.request.params.has('from_word')).toBeFalse();
    expect(req.request.params.has('to_word')).toBeFalse();
    req.flush({ units: [], truncated: false });
  });

  it('previews a word range with word params', () => {
    service.quranRange({ surah: 2, ayah: 5, word: 3 }, { surah: 2, ayah: 6, word: 2 }).subscribe();
    const req = httpMock.expectOne(
      (r) => r.url === `${environment.ADMIN_API_BASE_URL}/content/quran-range/`
    );
    expect(req.request.params.get('from_word')).toBe('3');
    expect(req.request.params.get('to_word')).toBe('2');
    req.flush({ units: [], truncated: false });
  });
});

describe('isGroupTemplate', () => {
  it('is true only for the group templates', () => {
    expect(isGroupTemplate('word_group')).toBeTrue();
    expect(isGroupTemplate('ayah_group')).toBeTrue();
    expect(isGroupTemplate('word')).toBeFalse();
    expect(isGroupTemplate(null)).toBeFalse();
  });
});
