import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { resolveApiErrorMessage } from '../../../../shared/utils/api-error-resolver.util';
import {
  InquiryContentKind,
  PublisherInquiry,
  PublisherInquiryService,
} from '../../services/publisher-inquiry.service';

const KINDS: { value: InquiryContentKind; key: string }[] = [
  { value: 'recitations', key: 'RECITATIONS' },
  { value: 'mushafs', key: 'MUSHAFS' },
  { value: 'text', key: 'TEXT' },
  { value: 'fonts', key: 'FONTS' },
  { value: 'several', key: 'SEVERAL' },
];

/** The "contact us to join" form on the publisher page. */
@Component({
  selector: 'app-join-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  styleUrls: ['./join-form.component.less'],
  templateUrl: './join-form.component.html',
})
export class JoinFormComponent {
  private readonly service = inject(PublisherInquiryService);
  private readonly translate = inject(TranslateService);

  readonly kinds = KINDS;
  readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    organization: ['', [Validators.required, Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    content_kind: ['several' as InquiryContentKind, Validators.required],
    message: ['', Validators.maxLength(5000)],
    website: [''],
  });

  readonly sending = signal(false);
  readonly sentTo = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  showError(control: 'name' | 'organization' | 'email'): string | null {
    const c = this.form.controls[control];
    if (!c.invalid || !(c.touched || c.dirty)) return null;
    return c.hasError('email') ? 'LANDING.PUB.FORM.INVALID_EMAIL' : 'LANDING.PUB.FORM.REQUIRED';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const inquiry: PublisherInquiry = this.form.getRawValue();
    this.sending.set(true);
    this.error.set(null);
    this.service.send(inquiry).subscribe({
      next: () => {
        this.sending.set(false);
        this.sentTo.set(inquiry.email);
        this.form.reset();
      },
      error: (err: unknown) => {
        this.sending.set(false);
        this.error.set(
          resolveApiErrorMessage(err, { fallbackKey: 'LANDING.PUB.FORM.FAILED' }, this.translate)
        );
      },
    });
  }

  sendAnother(): void {
    this.sentTo.set(null);
  }
}
