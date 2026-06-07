import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { OauthCallbackPage } from './oauth-callback.page';

describe('OauthCallbackPage', () => {
  let bootstrapSessionAfterOAuthRedirect: jasmine.Spy;
  let router: Router;
  const qpmStore: Record<string, string> = {};

  beforeEach(async () => {
    qpmStore['next'] = '';
    bootstrapSessionAfterOAuthRedirect = jasmine.createSpy('bootstrapSessionAfterOAuthRedirect');
    await TestBed.configureTestingModule({
      imports: [OauthCallbackPage, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { bootstrapSessionAfterOAuthRedirect } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => {
                  const v = qpmStore[key];
                  return v ? v : null;
                },
              },
            },
          },
        },
      ],
    }).compileComponents();
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.stub();
    spyOn(router, 'navigateByUrl').and.stub();
  });

  it('navigates to resume URL when session is authenticated', () => {
    bootstrapSessionAfterOAuthRedirect.and.returnValue(
      of({
        status: 200,
        meta: { is_authenticated: true },
        data: { user: { id: 1 }, methods: [] },
      })
    );

    TestBed.createComponent(OauthCallbackPage).detectChanges();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/gallery');
  });

  it('navigates to pending provider_signup flow with resume next query', () => {
    qpmStore['next'] = '/settings';
    bootstrapSessionAfterOAuthRedirect.and.returnValue(
      of({
        status: 401,
        data: {
          flows: [{ id: 'provider_signup', is_pending: true }],
          methods: [],
        },
      })
    );

    TestBed.createComponent(OauthCallbackPage).detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(['/account/provider/signup'], {
      queryParams: { next: '/settings' },
    });
  });

  it('on error shows message and redirects to login after timeout', fakeAsync(() => {
    bootstrapSessionAfterOAuthRedirect.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 502 }))
    );

    TestBed.createComponent(OauthCallbackPage).detectChanges();

    tick(2000);

    expect(router.navigate).toHaveBeenCalledWith(['/account/login'], undefined);
  }));
});
