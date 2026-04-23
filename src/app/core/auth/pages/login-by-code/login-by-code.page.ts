import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-by-code-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LangSwitchComponent],
  styleUrls: ['./login-by-code.page.less'],
  templateUrl: './login-by-code.page.html',
})
export class LoginByCodePage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  step = signal<'email' | 'code'>('email');
  emailForm: FormGroup;
  codeForm: FormGroup;
  errorMessage = signal<string>('');
  isLoading = signal(false);

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

  goToEmail(): void {
    this.step.set('email');
  }

  async requestCode(): Promise<void> {
    if (this.emailForm.invalid) {
      return;
    }
    this.errorMessage.set('');
    this.isLoading.set(true);
    try {
      await firstValueFrom(
        this.auth.headlessAuth.requestLoginCode({ email: this.emailForm.value.email })
      );
      this.isLoading.set(false);
      this.step.set('code');
    } catch (e) {
      this.isLoading.set(false);
      if (e instanceof HttpErrorResponse && e.status === 401) {
        if (tryNavigateForAuth401(this.router, e)) {
          return;
        }
        this.step.set('code');
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
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.auth.headlessAuth.confirmLoginCode({ code: this.codeForm.value.code })
      );
      this.isLoading.set(false);
      this.auth.applyHeadlessSuccess(res, { fetchProfile: true });
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/gallery';
      void this.router.navigateByUrl(returnUrl.startsWith('/') ? returnUrl : '/gallery');
    } catch (e) {
      this.isLoading.set(false);
      if (e instanceof HttpErrorResponse) {
        if (tryNavigateForAuth401(this.router, e)) {
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
