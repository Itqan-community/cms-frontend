import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
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
