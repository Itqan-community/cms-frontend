import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom, TimeoutError, timeout } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import {
  getErrorMessage,
  isIncorrectCodeError,
  parseRetryAfterSeconds,
} from '../../../../shared/utils/error.utils';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-by-code-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LangSwitchComponent],
  styleUrls: ['./login-by-code.page.less'],
  templateUrl: './login-by-code.page.html',
})
export class LoginByCodePage implements OnInit, OnDestroy {
  private static readonly CODE_REQUEST_TIMEOUT_MS = 15000;

  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  step = signal<'email' | 'code'>('email');
  emailForm: FormGroup;
  codeForm: FormGroup;
  errorMessage = signal<string>('');
  infoMessage = signal<string>('');
  isLoading = signal(false);
  /** Remaining seconds for resend / send-code throttling. */
  resendCooldownSeconds = signal(0);

  constructor() {
    this.emailForm = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
    this.codeForm = this.fb.group({ code: ['', [Validators.required, Validators.minLength(4)]] });
  }

  ngOnInit(): void {
    const s = this.route.snapshot.queryParamMap.get('step');
    if (s === 'confirm') {
      this.step.set('code');
    }
  }

  ngOnDestroy(): void {
    this.clearCooldownTimer();
  }

  goToEmail(): void {
    this.clearCooldown();
    this.infoMessage.set('');
    this.errorMessage.set('');
    this.step.set('email');
  }

  private clearCooldownTimer(): void {
    if (this.cooldownTimer != null) {
      clearInterval(this.cooldownTimer);
      this.cooldownTimer = null;
    }
  }

  private clearCooldown(): void {
    this.clearCooldownTimer();
    this.resendCooldownSeconds.set(0);
  }

  private startCooldown(totalSeconds: number): void {
    this.clearCooldownTimer();
    if (totalSeconds < 1) {
      this.resendCooldownSeconds.set(0);
      return;
    }
    this.resendCooldownSeconds.set(totalSeconds);
    this.cooldownTimer = setInterval(() => {
      const n = this.resendCooldownSeconds() - 1;
      this.resendCooldownSeconds.set(n);
      if (n < 1) {
        this.clearCooldownTimer();
      }
    }, 1000);
  }

  private apply429Cooldown(err: HttpErrorResponse): void {
    const s = parseRetryAfterSeconds(err);
    this.startCooldown(s ?? 30);
  }

  private isRequestTimeoutError(error: unknown): boolean {
    return error instanceof TimeoutError;
  }

  requestCode(): Promise<void> {
    if (this.emailForm.invalid) {
      return Promise.resolve();
    }
    if (this.resendCooldownSeconds() > 0) {
      return Promise.resolve();
    }
    this.infoMessage.set('');
    this.errorMessage.set('');
    return this.sendCodeRequest({ fromResend: false });
  }

  resendCode(): Promise<void> {
    if (this.resendCooldownSeconds() > 0) {
      return Promise.resolve();
    }
    this.infoMessage.set('');
    this.errorMessage.set('');
    return this.sendCodeRequest({ fromResend: true });
  }

  private async sendCodeRequest(opts: { fromResend: boolean }): Promise<void> {
    if (this.emailForm.invalid) {
      return;
    }
    this.isLoading.set(true);
    try {
      await firstValueFrom(
        this.auth.headlessAuth
          .requestLoginCode({ email: this.emailForm.value.email })
          .pipe(timeout({ first: LoginByCodePage.CODE_REQUEST_TIMEOUT_MS }))
      );
      this.isLoading.set(false);
      this.clearCooldown();
      if (opts.fromResend) {
        this.infoMessage.set(this.translate.instant('AUTH.LOGIN_BY_CODE.RESEND_SENT'));
        this.codeForm.patchValue({ code: '' });
      } else {
        this.step.set('code');
      }
    } catch (e) {
      this.isLoading.set(false);
      if (e instanceof HttpErrorResponse) {
        if (e.status === 401) {
          if (tryNavigateForAuth401(this.router, e)) {
            return;
          }
          this.step.set('code');
          return;
        }
        if (e.status === 429) {
          this.apply429Cooldown(e);
          this.errorMessage.set(this.translate.instant('AUTH.LOGIN_BY_CODE.RATE_LIMIT'));
          return;
        }
        if (e.status === 410) {
          this.errorMessage.set(this.translate.instant('AUTH.LOGIN_BY_CODE.SESSION_GONE'));
          return;
        }
        this.errorMessage.set(
          getErrorMessage(e) || this.translate.instant('AUTH.LOGIN_BY_CODE.REQUEST_ERROR')
        );
        return;
      }
      if (this.isRequestTimeoutError(e)) {
        this.errorMessage.set(this.translate.instant('AUTH.LOGIN_BY_CODE.REQUEST_TIMEOUT'));
        return;
      }
      this.errorMessage.set(
        getErrorMessage(e) || this.translate.instant('AUTH.LOGIN_BY_CODE.REQUEST_ERROR')
      );
    }
  }

  async confirmCode(): Promise<void> {
    if (this.codeForm.invalid) {
      return;
    }
    this.errorMessage.set('');
    this.infoMessage.set('');
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.auth.headlessAuth.confirmLoginCode({ code: this.codeForm.value.code })
      );
      await firstValueFrom(this.auth.applyHeadlessSuccess(res, { fetchProfile: true }));
      this.isLoading.set(false);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/gallery';
      void this.router.navigateByUrl(returnUrl.startsWith('/') ? returnUrl : '/gallery');
    } catch (e) {
      this.isLoading.set(false);
      if (e instanceof HttpErrorResponse) {
        if (tryNavigateForAuth401(this.router, e)) {
          return;
        }
        if (e.status === 429) {
          this.apply429Cooldown(e);
          this.errorMessage.set(this.translate.instant('AUTH.LOGIN_BY_CODE.RATE_LIMIT'));
          return;
        }
        if (e.status === 410) {
          this.errorMessage.set(this.translate.instant('AUTH.LOGIN_BY_CODE.SESSION_GONE'));
          return;
        }
        if (e.status === 400) {
          if (isIncorrectCodeError(e)) {
            this.errorMessage.set(this.translate.instant('AUTH.LOGIN_BY_CODE.INCORRECT_CODE'));
          } else {
            this.errorMessage.set(
              getErrorMessage(e) || this.translate.instant('AUTH.LOGIN_BY_CODE.CONFIRM_ERROR')
            );
          }
          return;
        }
        this.errorMessage.set(
          getErrorMessage(e) || this.translate.instant('AUTH.LOGIN_BY_CODE.CONFIRM_ERROR')
        );
        return;
      }
      this.errorMessage.set(this.translate.instant('AUTH.LOGIN_BY_CODE.CONFIRM_ERROR'));
    }
  }
}
