import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { PublisherInquiryService } from '../../services/publisher-inquiry.service';
import { JoinFormComponent } from './join-form.component';

describe('JoinFormComponent', () => {
  let send: jasmine.Spy;

  function render() {
    TestBed.configureTestingModule({
      imports: [JoinFormComponent, TranslateModule.forRoot()],
      providers: [{ provide: PublisherInquiryService, useValue: { send } }],
    });
    const fixture = TestBed.createComponent(JoinFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  function fill(fixture: ReturnType<typeof render>): void {
    fixture.componentInstance.form.patchValue({
      name: 'Ahmad',
      organization: 'Tafsir Center',
      email: 'ahmad@example.org',
      content_kind: 'text',
      message: 'We publish tafsirs.',
    });
  }

  beforeEach(() => {
    send = jasmine.createSpy('send').and.returnValue(of({ message: 'ok' }));
  });

  it('does not send an incomplete form and marks the missing fields', () => {
    const fixture = render();

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(send).not.toHaveBeenCalled();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#join-name')?.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('#join-email-err')?.textContent).toContain('LANDING.PUB.FORM.REQUIRED');
  });

  it('flags an invalid email', () => {
    const fixture = render();
    fill(fixture);
    fixture.componentInstance.form.controls.email.setValue('not-an-email');
    fixture.componentInstance.form.controls.email.markAsTouched();
    fixture.detectChanges();

    expect(fixture.componentInstance.showError('email')).toBe('LANDING.PUB.FORM.INVALID_EMAIL');
  });

  it('sends the inquiry with an empty honeypot and shows the thank-you note', () => {
    const fixture = render();
    fill(fixture);

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(send).toHaveBeenCalledOnceWith({
      name: 'Ahmad',
      organization: 'Tafsir Center',
      email: 'ahmad@example.org',
      content_kind: 'text',
      message: 'We publish tafsirs.',
      website: '',
    });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role="status"]')?.textContent).toContain(
      'LANDING.PUB.FORM.SENT_TITLE'
    );
    expect(el.querySelector('form')).toBeNull();
  });

  it("shows the backend's message when sending fails, and keeps the form", () => {
    send.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { error_name: 'validation_error', message: 'Enter a valid email address.' },
          })
      )
    );
    const fixture = render();
    fill(fixture);

    fixture.componentInstance.submit();
    fixture.detectChanges();

    const alert: HTMLElement | null = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert?.textContent?.trim()).toBeTruthy();
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
    expect(fixture.componentInstance.sending()).toBeFalse();
  });
});
