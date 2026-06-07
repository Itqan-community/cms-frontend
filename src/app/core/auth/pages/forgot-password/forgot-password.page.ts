import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import type { AuthenticationResponse, Flow } from '../../headless/headless-api.types';
import {
  isPasswordResetByCodePending,
  tryNavigateForAuth401,
} from '../../headless/headless-auth-flow.util';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LangSwitchComponent],
  styleUrls: ['./forgot-password.page.less'],
  templateUrl: './forgot-password.page.html',
})
export class ForgotPasswordPage {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  form: FormGroup;
  errorMessage = signal<string>('');
  infoMessage = signal<string>('');
  isLoading = signal(false);

  constructor() {
    this.form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.isLoading.set(true);
    try {
      await firstValueFrom(
        this.auth.headlessAuth.requestPasswordReset({ email: this.form.value.email })
      );
      this.isLoading.set(false);
      this.infoMessage.set(this.translate.instant('AUTH.FORGOT_PASSWORD.SENT'));
    } catch (e) {
      this.isLoading.set(false);
      if (e instanceof HttpErrorResponse && e.status === 401) {
        const authErr = e.error as Partial<AuthenticationResponse>;
        this.auth.applyMetaTokens(authErr.meta);
        if (authErr.data?.flows && isPasswordResetByCodePending(authErr.data.flows as Flow[])) {
          void this.router.navigate(['/account/password/reset/complete'], {
            queryParams: { email: this.form.value.email as string },
          });
          return;
        }
        if (tryNavigateForAuth401(this.router, e)) {
          return;
        }
        this.infoMessage.set(this.translate.instant('AUTH.FORGOT_PASSWORD.SENT'));
        return;
      }
      this.errorMessage.set(
        getErrorMessage(e) || this.translate.instant('AUTH.FORGOT_PASSWORD.ERROR')
      );
    }
  }
}
