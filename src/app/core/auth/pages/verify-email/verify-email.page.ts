import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { AuthBackLinkComponent } from '../../components/auth-back-link/auth-back-link.component';
import { resolveAuthErrorMessage } from '../../../../shared/utils/auth-error-resolver.util';
import { AuthService } from '../../services/auth.service';
import { readContinueUrl } from '../../utils/auth-route-query.util';

@Component({
  selector: 'app-verify-email-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    LangSwitchComponent,
    AuthBackLinkComponent,
  ],
  styleUrls: ['./verify-email.page.less'],
  templateUrl: './verify-email.page.html',
})
export class VerifyEmailPage implements OnInit {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  form: FormGroup;
  errorMessage = signal<string>('');
  infoMessage = signal<string>('');
  isSubmitting = signal(false);

  constructor() {
    this.form = this.fb.group({
      key: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    const fromParam = this.route.snapshot.paramMap.get('key');
    const fromQuery = this.route.snapshot.queryParamMap.get('key');
    const k = fromParam ?? fromQuery;
    if (k) {
      this.form.patchValue({ key: k });
    }
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'unverified_email') {
      this.infoMessage.set(this.translate.instant('AUTH.VERIFY_EMAIL.UNVERIFIED_REDIRECT_INFO'));
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }
    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.authService.verifyEmailWithKey(this.form.value.key as string).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        void this.router.navigateByUrl(readContinueUrl(this.route.snapshot.queryParamMap));
      },
      error: (err: unknown) => {
        this.isSubmitting.set(false);
        if (err instanceof HttpErrorResponse) {
          this.errorMessage.set(
            resolveAuthErrorMessage(
              err,
              { fallbackKey: 'AUTH.VERIFY_EMAIL.ERROR', context: 'verify_email' },
              this.translate
            )
          );
        } else {
          this.errorMessage.set(this.translate.instant('AUTH.VERIFY_EMAIL.ERROR'));
        }
      },
    });
  }

  onResend(): void {
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.authService.resendEmailVerification().subscribe({
      next: () => {
        this.infoMessage.set(this.translate.instant('AUTH.VERIFY_EMAIL.RESEND_SENT'));
      },
      error: (err: unknown) => {
        this.errorMessage.set(
          resolveAuthErrorMessage(
            err,
            { fallbackKey: 'AUTH.VERIFY_EMAIL.RESEND_ERROR', context: 'verify_email' },
            this.translate
          )
        );
      },
    });
  }
}
