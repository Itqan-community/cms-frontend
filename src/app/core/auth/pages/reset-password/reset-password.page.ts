import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LangSwitchComponent],
  styleUrls: ['./reset-password.page.less'],
  templateUrl: './reset-password.page.html',
})
export class ResetPasswordPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  form: FormGroup;
  errorMessage = signal<string>('');
  isLoading = signal(false);
  /** Key from email link (`?key=` or `/account/password/reset/key/:key`). */
  resetKey = signal<string | null>(null);
  /** Hint: email used when coming from forgot-password (code flow). */
  sentToEmail = signal<string | null>(null);

  constructor() {
    this.form = this.fb.group(
      {
        resetCode: [''],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirm: ['', [Validators.required]],
      },
      { validators: this.matchPassword }
    );
  }

  private matchPassword(g: FormGroup): { passwordMismatch: boolean } | null {
    return g.get('password')?.value === g.get('confirm')?.value ? null : { passwordMismatch: true };
  }

  ngOnInit(): void {
    const k =
      this.route.snapshot.queryParamMap.get('key') ?? this.route.snapshot.paramMap.get('key');
    this.resetKey.set(k);
    const emailQ = this.route.snapshot.queryParamMap.get('email');
    if (emailQ) {
      this.sentToEmail.set(emailQ);
    }

    const codeCtrl = this.form.get('resetCode');
    if (k) {
      codeCtrl?.clearValidators();
    } else {
      codeCtrl?.setValidators([Validators.required, Validators.minLength(4)]);
    }
    codeCtrl?.updateValueAndValidity();
  }

  /** Key from URL or typed code — for template bindings. */
  currentResetKey(): string | null {
    return this.resolveResetKey();
  }

  private resolveResetKey(): string | null {
    const fromRoute = this.resetKey();
    if (fromRoute?.trim()) {
      return fromRoute.trim();
    }
    const typed = (this.form.get('resetCode')?.value as string | undefined)?.trim();
    return typed && typed.length ? typed : null;
  }

  async onSubmit(): Promise<void> {
    const key = this.resolveResetKey();
    if (this.form.invalid || !key) {
      return;
    }
    this.errorMessage.set('');
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.auth.headlessAuth.resetPassword({ key, password: this.form.value.password })
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
        if (e.status === 401) {
          void this.router.navigate(['/login']);
          return;
        }
        this.errorMessage.set(
          getErrorMessage(e) || this.translate.instant('AUTH.RESET_PASSWORD.ERROR')
        );
        return;
      }
      this.errorMessage.set(
        getErrorMessage(e) || this.translate.instant('AUTH.RESET_PASSWORD.ERROR')
      );
    }
  }
}
