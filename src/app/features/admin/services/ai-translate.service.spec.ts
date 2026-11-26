import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CALLER_SHOWS_ERRORS } from '../../../core/interceptors/caller-shows-errors.context';
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
      .translate({ mode: 'translate', category: 'text', fields: { name: 'تفسير' } })
      .subscribe((r) => (result = r));

    const req = httpMock.expectOne(`${environment.ADMIN_API_BASE_URL}/ai/translate/`);
    expect(req.request.method).toBe('POST');
    // Callers show their own error toast; the global one must stay quiet.
    expect(req.request.context.get(CALLER_SHOWS_ERRORS)).toBeTrue();
    expect(req.request.body).toEqual({
      mode: 'translate',
      category: 'text',
      fields: { name: 'تفسير' },
    });
    req.flush({ fields: { name: 'Tafsir' }, sources: [], slug: null });
    expect(result).toEqual({ fields: { name: 'Tafsir' }, sources: [], slug: null });
  });
});
