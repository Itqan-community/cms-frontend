import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthSocialActionsComponent } from './auth-social-actions.component';

describe('AuthSocialActionsComponent', () => {
  let fixture: ComponentFixture<AuthSocialActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthSocialActionsComponent, TranslateModule.forRoot()],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(AuthSocialActionsComponent);
    fixture.componentRef.setInput('flow', 'login');
    fixture.detectChanges();
  });

  it('emits passkey when login passkey button is clicked', () => {
    const passkeySpy = jasmine.createSpy('passkey');
    fixture.componentInstance.passkey.subscribe(passkeySpy);
    const btn = fixture.nativeElement.querySelector(
      '.auth-social__btn--passkey'
    ) as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.tagName).toBe('BUTTON');
    btn.click();
    expect(passkeySpy).toHaveBeenCalled();
  });

  it('navigates to signup passkey page with optional email query param', () => {
    fixture.componentRef.setInput('flow', 'signup');
    fixture.componentRef.setInput('passkeySignupEmail', 'user@example.com');
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector(
      '.auth-social__btn--passkey'
    ) as HTMLAnchorElement;
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toContain('/passkey');
    expect(link.getAttribute('href')).toContain('flow=signup');
    expect(link.getAttribute('href')).toMatch(/email=user(@|%40)example\.com/);
  });
});
