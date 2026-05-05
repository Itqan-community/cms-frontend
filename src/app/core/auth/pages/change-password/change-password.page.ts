import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
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
  private readonly router = inject(Router);

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
      this.successMessage.set('Password changed successfully.');
      this.form.reset();
      // Optional: navigate away or stay with success message
      // await this.router.navigateByUrl('/gallery');
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'error' in error) {
        const errBody = (error as { error: { errors?: { message: string }[] } }).error;
        if (errBody?.errors?.[0]?.message) {
          this.errorMessage.set(errBody.errors[0].message);
        } else {
          this.errorMessage.set('Failed to change password. Please try again.');
        }
      } else {
        this.errorMessage.set('Failed to change password. Please try again.');
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
