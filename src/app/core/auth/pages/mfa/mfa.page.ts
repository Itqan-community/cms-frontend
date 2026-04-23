import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-mfa-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LangSwitchComponent],
  styleUrls: ['./mfa.page.less'],
  templateUrl: './mfa.page.html',
})
export class MfaPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  form: FormGroup;
  errorMessage = signal<string>('');
  isLoading = signal(false);

  constructor() {
    this.form = this.fb.group({ code: ['', [Validators.required, Validators.minLength(4)]] });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      return;
    }
    this.errorMessage.set('');
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.auth.headlessAuth.mfaAuthenticate({ code: this.form.value.code })
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
        this.errorMessage.set(getErrorMessage(e) || this.translate.instant('AUTH.MFA.ERROR'));
        return;
      }
      this.errorMessage.set(this.translate.instant('AUTH.MFA.ERROR'));
    }
  }
}
