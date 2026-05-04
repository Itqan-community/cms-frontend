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
  const qpmStore: Record<string, string | undefined> = {};

  beforeEach(async () => {
    qpmStore['next'] = '';
    qpmStore['error'] = undefined;
    qpmStore['error_description'] = undefined;
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
                  return v !== undefined && v !== '' ? v : null;
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

  it('navigates to resume URL when session has user (200)', () => {
    bootstrapSessionAfterOAuthRedirect.and.returnValue(
      of({
        status: 200,
        meta: { is_authenticated: true },
        data: { user: { id: 1 }, methods: [] },
      }),
    );

    TestBed.createComponent(OauthCallbackPage).detectChanges();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/gallery');
  });

  it('navigates to resume URL when session has user (401 + meta.is_authenticated)', () => {
    bootstrapSessionAfterOAuthRedirect.and.returnValue(
      of({
        status: 401,
        meta: { is_authenticated: true },
        data: { user: { id: 9 }, flows: [], methods: [] },
      }),
    );

    TestBed.createComponent(OauthCallbackPage).detectChanges();

    expect(router.navigateByUrl).toHaveBeenCalledWith('/gallery');
  });

  it('navigates to pending provider_signup before treating 200+user as complete', () => {
    qpmStore['next'] = '/settings';
    bootstrapSessionAfterOAuthRedirect.and.returnValue(
      of({
        status: 200,
        meta: { is_authenticated: true },
        data: {
          user: { id: 1 },
          flows: [{ id: 'provider_signup', is_pending: true }],
          methods: [],
        },
      }),
    );

    TestBed.createComponent(OauthCallbackPage).detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/account/provider/signup'],
      { queryParams: { next: '/settings' } },
    );
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('navigates to pending provider_signup flow with resume next query (401 envelope)', () => {
    qpmStore['next'] = '/settings';
    bootstrapSessionAfterOAuthRedirect.and.returnValue(
      of({
        status: 401,
        data: {
          flows: [{ id: 'provider_signup', is_pending: true }],
          methods: [],
        },
      }),
    );

    TestBed.createComponent(OauthCallbackPage).detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(
      ['/account/provider/signup'],
      { queryParams: { next: '/settings' } },
    );
  });

  it('sets mapped message key when error query is present', () => {
    qpmStore['error'] = 'access_denied';
    const fixture = TestBed.createComponent(OauthCallbackPage);
    fixture.detectChanges();

    expect(fixture.componentInstance.message()).toBe('AUTH.OAUTH.ACCESS_DENIED');
  });

  it('on bootstrap error shows message and redirects to login after timeout', fakeAsync(() => {
    bootstrapSessionAfterOAuthRedirect.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 502 })),
    );

    TestBed.createComponent(OauthCallbackPage).detectChanges();

    tick(2000);

    expect(router.navigate).toHaveBeenCalledWith(['/account/login'], undefined);
  }));
});
