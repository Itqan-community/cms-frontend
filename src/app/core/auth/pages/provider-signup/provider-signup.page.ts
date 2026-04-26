import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { AuthService } from '../../services/auth.service';

/**
 * Completes headless `provider_signup` when OAuth did not return enough data (contract:
 * `GET/POST .../auth/provider/signup`).
 */
@Component({
  selector: 'app-provider-signup-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LangSwitchComponent],
  styleUrls: ['./provider-signup.page.less'],
  templateUrl: './provider-signup.page.html',
})
export class ProviderSignupPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  form: FormGroup;
  errorMessage = signal<string>('');
  infoMessage = signal<string>('');
  isLoading = signal(false);
  loadError = signal(false);

  constructor() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    this.auth.headlessAuth.getProviderSignupInfo().subscribe({
      next: (info: unknown) => {
        if (info && typeof info === 'object' && 'data' in (info as object)) {
          const d = (info as { data?: { email?: string } }).data;
          if (d?.email) {
            this.form.patchValue({ email: d.email });
          }
        }
      },
      error: (e) => {
        this.loadError.set(true);
        this.infoMessage.set(
          e instanceof HttpErrorResponse
            ? getErrorMessage(e) || this.translate.instant('AUTH.PROVIDER_SIGNUP.LOAD_ERROR')
            : this.translate.instant('AUTH.PROVIDER_SIGNUP.LOAD_ERROR')
        );
      },
    });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.errorMessage.set('');
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.auth.headlessAuth.postProviderSignup({ email: this.form.value.email as string })
      );
      await firstValueFrom(this.auth.applyHeadlessSuccess(res, { fetchProfile: true }));
      this.isLoading.set(false);
      void this.router.navigateByUrl('/gallery');
    } catch (e) {
      this.isLoading.set(false);
      if (e instanceof HttpErrorResponse) {
        if (tryNavigateForAuth401(this.router, e)) {
          return;
        }
        this.errorMessage.set(
          getErrorMessage(e) || this.translate.instant('AUTH.PROVIDER_SIGNUP.ERROR')
        );
        return;
      }
      this.errorMessage.set(this.translate.instant('AUTH.PROVIDER_SIGNUP.ERROR'));
    }
  }
}
