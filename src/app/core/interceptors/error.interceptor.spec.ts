import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NzMessageService } from 'ng-zorro-antd/message';
import { environment } from '../../../environments/environment';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let httpMock: HttpTestingController;
  let http: HttpClient;
  let messageSpy: jasmine.SpyObj<NzMessageService>;
  const api = environment.API_BASE_URL;

  beforeEach(() => {
    messageSpy = jasmine.createSpyObj<NzMessageService>('NzMessageService', ['error']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: NzMessageService, useValue: messageSpy },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('does not show global toast for 409 unverified_email on headless app URL', (done) => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    const url = `${api}/auth/app/v1/account/authenticators/totp`;
    http.get(url).subscribe({
      error: () => {
        expect(messageSpy.error).not.toHaveBeenCalled();
        done();
      },
    });
    const req = httpMock.expectOne(url);
    req.flush(
      {
        status: 409,
        errors: [
          {
            code: 'unverified_email',
            message: 'Verify email first.',
          },
        ],
      },
      { status: 409, statusText: 'Conflict' }
    );
  });

  it('does not show global toast for GET TOTP status HTTP 404 (not enrolled)', (done) => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    const url = `${api}/auth/app/v1/account/authenticators/totp`;
    http.get(url).subscribe({
      error: () => {
        expect(messageSpy.error).not.toHaveBeenCalled();
        done();
      },
    });
    const req = httpMock.expectOne(url);
    req.flush(null, { status: 404, statusText: 'Not Found' });
  });

  it('shows global toast for other server errors', (done) => {
    if (!api) {
      pending('API_BASE_URL');
      return;
    }
    const url = `${api}/auth/profile/`;
    http.get(url).subscribe({
      error: () => {
        expect(messageSpy.error).toHaveBeenCalled();
        done();
      },
    });
    const req = httpMock.expectOne(url);
    req.flush({ message: 'fail' }, { status: 500, statusText: 'Server Error' });
  });
});
