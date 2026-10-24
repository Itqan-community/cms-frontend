import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { AiTranslateResponse, AiTranslateService } from './ai-translate.service';

describe('AiTranslateService', () => {
  let service: AiTranslateService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AiTranslateService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AiTranslateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts the request to the portal translate endpoint', () => {
    let result: AiTranslateResponse | undefined;
    service
      .translate({ mode: 'translate', category: 'tafsir', fields: { name: 'تفسير' } })
      .subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.ADMIN_API_BASE_URL}/ai/translate/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      mode: 'translate',
      category: 'tafsir',
      fields: { name: 'تفسير' },
    });
    req.flush({ fields: { name: 'Tafsir' }, sources: [], slug: null });
    expect(result).toEqual({ fields: { name: 'Tafsir' }, sources: [], slug: null });
  });
});
