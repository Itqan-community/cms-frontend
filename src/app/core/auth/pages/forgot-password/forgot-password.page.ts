import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LangSwitchComponent],
  styleUrls: ['./forgot-password.page.less'],
  templateUrl: './forgot-password.page.html',
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);
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
      if (e instanceof HttpErrorResponse && (e.status === 401 || e.status === 200)) {
        this.infoMessage.set(this.translate.instant('AUTH.FORGOT_PASSWORD.SENT'));
        return;
      }
      this.errorMessage.set(
        getErrorMessage(e) || this.translate.instant('AUTH.FORGOT_PASSWORD.ERROR')
      );
    }
  }
}
