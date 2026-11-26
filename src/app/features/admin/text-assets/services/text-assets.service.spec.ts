import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../../environments/environment';
import type { TextAssetFormValue } from '../models/text-assets.models';
import { TextAssetsService } from './text-assets.service';

describe('TextAssetsService create with a first file', () => {
  let service: TextAssetsService;
  let httpMock: HttpTestingController;
  const file = new File(['chapter,verse,meaning\n1,1,x\n'], 'data.csv', { type: 'text/csv' });
  const body = { name_en: 'Demo', publisher_id: 1, template: 'ayah' } as TextAssetFormValue;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TextAssetsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sends the column mapping with the file', () => {
    // Act
    service.create({ ...body, file, column_mapping: { surah: 0, ayah: 1, text: 2 } }).subscribe();
    const req = httpMock.expectOne(`${environment.ADMIN_API_BASE_URL}/text-assets/`);

    // Assert
    const form = req.request.body as FormData;
    expect(form.get('column_mapping')).toBe('{"surah":0,"ayah":1,"text":2}');
    req.flush({});
  });

  it('sends no column mapping without a file', () => {
    // Act
    service.create({ ...body, column_mapping: { surah: 0 } }).subscribe();
    const req = httpMock.expectOne(`${environment.ADMIN_API_BASE_URL}/text-assets/`);

    // Assert
    expect((req.request.body as FormData).has('column_mapping')).toBeFalse();
    req.flush({});
  });
});
