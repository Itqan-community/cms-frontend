import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import {
  getErrorMessage,
} from '../../../../shared/utils/error.utils';
import type {
  AuthenticatorListItem,
  RecoveryCodesResponse,
  TotpStatusResult,
} from '../../headless/headless-api.types';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { isPasskeyClientEnvironmentSupported } from '../../headless/webauthn-capability.util';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-security-settings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LangSwitchComponent],
  styleUrls: ['./security-settings.page.less'],
  templateUrl: './security-settings.page.html',
})
export class SecuritySettingsPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  totpForm: FormGroup = this.fb.group({ code: ['', [Validators.required, Validators.minLength(6)]] });

  isLoading = signal(false);
  pageError = signal<string>('');
  authenticators = signal<AuthenticatorListItem[]>([]);

  totpState = signal<TotpStatusResult | null>(null);
  recoveryData = signal<RecoveryCodesResponse['data'] | null>(null);
  recoveryLoadError = signal<string>('');

  mfaSupported = signal<string[]>([]);
  /** User confirmed regeneration (single-session guard). */
  regenerateArmed = signal(false);

  passkeysSupported = signal(false);

  ngOnInit(): void {
    this.passkeysSupported.set(isPasskeyClientEnvironmentSupported());
    void this.reloadAll();
  }

  async reloadAll(): Promise<void> {
    this.pageError.set('');
    this.isLoading.set(true);
    try {
      const cfg = await firstValueFrom(this.auth.headlessAuth.getConfig()).catch(() => null);
      if (cfg?.data?.mfa?.supported_types?.length) {
        this.mfaSupported.set(cfg.data.mfa.supported_types);
      } else {
        // Align with typical allauth MFA defaults when config is temporarily unavailable.
        this.mfaSupported.set(['totp', 'recovery_codes', 'webauthn']);
      }
      const list = await firstValueFrom(this.auth.headlessAuth.listAuthenticators());
      this.authenticators.set(list.data ?? []);

      const totp = await firstValueFrom(this.auth.headlessAuth.getTotpStatus());
      this.totpState.set(totp);

      if (totp.kind === 'active' || list.data.some((a) => a.type === 'recovery_codes')) {
        await this.loadRecoveryCodesSilently();
      } else {
        this.recoveryData.set(null);
      }
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        if (tryNavigateForAuth401(this.router, e)) {
          return;
        }
        this.pageError.set(getErrorMessage(e) || this.translate.instant('AUTH.SECURITY.LOAD_ERROR'));
      } else {
        this.pageError.set(this.translate.instant('AUTH.SECURITY.LOAD_ERROR'));
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadRecoveryCodesSilently(): Promise<void> {
    this.recoveryLoadError.set('');
    try {
      const res = await firstValueFrom(this.auth.headlessAuth.getRecoveryCodes());
      this.recoveryData.set(res.data);
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 404) {
        this.recoveryData.set(null);
        return;
      }
      if (e instanceof HttpErrorResponse) {
        this.recoveryLoadError.set(
          getErrorMessage(e) || this.translate.instant('AUTH.SECURITY.RECOVERY_LOAD_ERROR')
        );
      }
    }
  }

  async copyText(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }

  async copyRecoveryCodes(): Promise<void> {
    const codes = this.recoveryData()?.unused_codes ?? [];
    if (!codes.length) {
      return;
    }
    await this.copyText(codes.join('\n'));
  }

  downloadRecoveryCodes(): void {
    const codes = this.recoveryData()?.unused_codes ?? [];
    if (!codes.length) {
      return;
    }
    const text = ['Recovery Codes', '--------------', ...codes].join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  armRegenerate(): void {
    this.regenerateArmed.set(true);
  }

  cancelRegenerate(): void {
    this.regenerateArmed.set(false);
  }

  async confirmRegenerateRecoveryCodes(): Promise<void> {
    if (!this.regenerateArmed()) {
      return;
    }
    this.pageError.set('');
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(this.auth.headlessAuth.regenerateRecoveryCodes());
      this.recoveryData.set(res.data);
      this.regenerateArmed.set(false);
      await this.reloadAll();
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        if (tryNavigateForAuth401(this.router, e)) {
          return;
        }
        this.pageError.set(
          getErrorMessage(e) || this.translate.instant('AUTH.SECURITY.RECOVERY_REGEN_ERROR')
        );
        return;
      }
      this.pageError.set(this.translate.instant('AUTH.SECURITY.RECOVERY_REGEN_ERROR'));
    } finally {
      this.isLoading.set(false);
    }
  }

  async submitTotpCode(): Promise<void> {
    if (this.totpForm.invalid) {
      return;
    }
    this.pageError.set('');
    this.isLoading.set(true);
    try {
      const res = await firstValueFrom(
        this.auth.headlessAuth.activateTotp({ code: this.totpForm.value.code as string })
      );
      this.totpState.set({ kind: 'active', data: res.data, meta: res.meta });
      this.totpForm.reset();
      if (res.meta?.recovery_codes_generated) {
        await this.loadRecoveryCodesSilently();
      }
      await this.reloadAll();
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        if (tryNavigateForAuth401(this.router, e)) {
          this.isLoading.set(false);
          return;
        }
        this.pageError.set(
          getErrorMessage(e) || this.translate.instant('AUTH.SECURITY.TOTP_ACTIVATE_ERROR')
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async deactivateTotp(): Promise<void> {
    if (!confirm(this.translate.instant('AUTH.SECURITY.TOTP_DEACTIVATE_CONFIRM'))) {
      return;
    }
    this.isLoading.set(true);
    this.pageError.set('');
    try {
      await firstValueFrom(this.auth.headlessAuth.deactivateTotp());
      await this.reloadAll();
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        if (tryNavigateForAuth401(this.router, e)) {
          return;
        }
        this.pageError.set(
          getErrorMessage(e) || this.translate.instant('AUTH.SECURITY.TOTP_DEACTIVATE_ERROR')
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
