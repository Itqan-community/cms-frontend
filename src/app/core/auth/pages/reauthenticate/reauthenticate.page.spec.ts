import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';
import { ReauthenticatePage } from './reauthenticate.page';

describe('ReauthenticatePage', () => {
  it('goBack navigates to returnUrl (safe continuation, no replay)', () => {
    const navigateByUrl = jasmine.createSpy('navigateByUrl');
    TestBed.configureTestingModule({
      imports: [ReauthenticatePage, TranslateModule.forRoot()],
      providers: [
        {
          provide: AuthService,
          useValue: {
            headlessAuth: {
              reauthenticate: () => {
                throw new Error('not used');
              },
              getWebauthnReauthOptions: () => {
                throw new Error('not used');
              },
              postWebauthnReauth: () => {
                throw new Error('not used');
              },
            },
            applyHeadlessSuccess: () => {
              throw new Error('not used');
            },
          },
        },
        { provide: Router, useValue: { navigateByUrl } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (k: string) => (k === 'returnUrl' ? '/settings' : null),
              },
            },
          },
        },
      ],
    });
    const fixture: ComponentFixture<ReauthenticatePage> =
      TestBed.createComponent(ReauthenticatePage);
    const page = fixture.componentInstance;
    page.goBack();
    expect(navigateByUrl).toHaveBeenCalledWith('/settings');
  });
});
