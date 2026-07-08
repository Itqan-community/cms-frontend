import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { resolveAuthErrorMessage } from '../../../../shared/utils/auth-error-resolver.util';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-change-password-page',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    TranslateModule,
    LangSwitchComponent,
    NgIcon,
  ],
  templateUrl: './change-password.page.html',
  styleUrls: ['../login/login.page.less'],
})
export class ChangePasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);

  readonly form = this.fb.nonNullable.group({
    current_password: ['', Validators.required],
    new_password: ['', Validators.required],
  });

  isLoading = signal(false);
  errorMessage = signal<string>('');
  successMessage = signal<string>('');

  async submit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const v = this.form.getRawValue();
    try {
      await firstValueFrom(
        this.auth.headlessAuth.changePassword({
          current_password: v.current_password,
          new_password: v.new_password,
        })
      );
      this.successMessage.set(this.translate.instant('AUTH.CHANGE_PASSWORD.SUCCESS'));
      this.form.reset();
    } catch (error: unknown) {
      this.errorMessage.set(
        resolveAuthErrorMessage(
          error,
          { fallbackKey: 'AUTH.CHANGE_PASSWORD.ERROR', context: 'change_password' },
          this.translate
        )
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
