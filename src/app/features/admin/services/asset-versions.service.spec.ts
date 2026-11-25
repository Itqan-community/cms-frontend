import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { CALLER_SHOWS_ERRORS } from '../../../core/interceptors/caller-shows-errors.context';
import { AssetContentService } from './asset-content.service';
import { AssetVersionsService } from './asset-versions.service';

describe('Content import column mapping requests', () => {
  let versions: AssetVersionsService;
  let content: AssetContentService;
  let httpMock: HttpTestingController;
  const base = environment.ADMIN_API_BASE_URL;
  const file = new File(['chapter,verse,meaning\n1,1,x\n'], 'data.csv', { type: 'text/csv' });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    versions = TestBed.inject(AssetVersionsService);
    content = TestBed.inject(AssetContentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('previews the columns of a text asset file, showing its own errors', () => {
    // Act
    versions.previewImportColumns('my asset', file).subscribe();
    const req = httpMock.expectOne(`${base}/text-assets/my%20asset/import-columns/`);

    // Assert
    expect(req.request.method).toBe('POST');
    expect((req.request.body as FormData).get('file')).toBeInstanceOf(Blob);
    expect(req.request.context.get(CALLER_SHOWS_ERRORS)).toBeTrue();
    req.flush({});
  });

  it('sends the column mapping as JSON with an uploaded version', () => {
    // Act
    versions
      .create('text', 'my-asset', { asset_id: 1, file, column_mapping: { surah: 0, ayah: 1 } })
      .subscribe();
    const req = httpMock.expectOne(`${base}/text-assets/my-asset/versions/`);

    // Assert
    expect((req.request.body as FormData).get('column_mapping')).toBe('{"surah":0,"ayah":1}');
    expect(req.request.context.get(CALLER_SHOWS_ERRORS)).toBeTrue();
    req.flush({});
  });

  it('leaves the column mapping out when none was chosen', () => {
    // Act
    versions.update('text', 'my-asset', 3, { asset_id: 1, file, column_mapping: null }).subscribe();
    const req = httpMock.expectOne(`${base}/text-assets/my-asset/versions/3/`);

    // Assert
    expect((req.request.body as FormData).has('column_mapping')).toBeFalse();
    req.flush({});
  });

  it('sends the column mapping with a new language seed file', () => {
    // Act
    content
      .addLanguage(
        'text',
        'my-asset',
        'es',
        file,
        { label_en: '', label_ar: '', number: '1.0' },
        { text: 2 }
      )
      .subscribe();
    const req = httpMock.expectOne((r) => r.url.endsWith('/languages/'));

    // Assert
    expect((req.request.body as FormData).get('column_mapping')).toBe('{"text":2}');
    req.flush({});
  });
});
