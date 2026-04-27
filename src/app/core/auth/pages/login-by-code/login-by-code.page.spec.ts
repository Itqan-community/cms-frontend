import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { LoginByCodePage } from './login-by-code.page';

describe('LoginByCodePage', () => {
  let fixture: ComponentFixture<LoginByCodePage>;
  let page: LoginByCodePage;
  let requestLoginCode: jasmine.Spy;
  let confirmLoginCode: jasmine.Spy;
  let applyHeadlessSuccess: jasmine.Spy;

  beforeEach(async () => {
    requestLoginCode = jasmine.createSpy('requestLoginCode');
    confirmLoginCode = jasmine.createSpy('confirmLoginCode');
    applyHeadlessSuccess = jasmine.createSpy('applyHeadlessSuccess').and.returnValue(of({}));
    const auth = {
      headlessAuth: {
        requestLoginCode,
        confirmLoginCode,
      },
      applyHeadlessSuccess,
    };
    await TestBed.configureTestingModule({
      imports: [LoginByCodePage, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => null } } },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LoginByCodePage);
    page = fixture.componentInstance;
    page.emailForm.patchValue({ email: 'a@b.com' });
    fixture.detectChanges();
  });

  it('on 429 when sending code, starts cooldown from Retry-After', async () => {
    requestLoginCode.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 429,
            headers: new HttpHeaders({ 'Retry-After': '5' }),
          })
      )
    );
    await page.requestCode();
    expect(page.resendCooldownSeconds()).toBe(5);
    expect(page.errorMessage().length).toBeGreaterThan(0);
  });

  it('maps 400 incorrect_code to incorrect code message', async () => {
    page.step.set('code');
    page.codeForm.patchValue({ code: '123456' });
    confirmLoginCode.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              errors: [{ code: 'incorrect_code', message: 'No' }],
            },
          })
      )
    );
    await page.confirmCode();
    expect(page.errorMessage().toLowerCase()).toContain('code');
  });
});
