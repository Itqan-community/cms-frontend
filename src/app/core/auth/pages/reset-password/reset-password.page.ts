import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
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
  resetKey = signal<string | null>(null);

  constructor() {
    this.form = this.fb.group(
      {
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
  }

  async onSubmit(): Promise<void> {
    const key = this.resetKey();
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
      this.errorMessage.set(
        getErrorMessage(e) || this.translate.instant('AUTH.RESET_PASSWORD.ERROR')
      );
    }
  }
}
