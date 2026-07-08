import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { resolveAuthErrorMessage } from '../../../../shared/utils/auth-error-resolver.util';
import { isUnverifiedEmailError } from '../../../../shared/utils/error.utils';
import type {
  AuthenticatorListItem,
  RecoveryCodesResponse,
  TotpStatusResult,
} from '../../headless/headless-api.types';
import { AUTH_ROUTES, tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { isPasskeyClientEnvironmentSupported } from '../../headless/webauthn-capability.util';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-security-settings-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LangSwitchComponent],
  styleUrls: ['./security-settings.page.less'],
  templateUrl: './security-settings.page.html',
})
export class SecuritySettingsPage implements OnInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  authenticatorTypeLabel(type: string): string {
    const key = `AUTH.SECURITY.AUTHENTICATOR_TYPE.${type}`;
    const translated = this.translate.instant(key);
    return translated !== key ? translated : type;
  }

  totpForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6)]],
  });

  isLoading = signal(false);
  pageError = signal<string>('');
  authenticators = signal<AuthenticatorListItem[]>([]);

  totpState = signal<TotpStatusResult | null>(null);
  recoveryData = signal<RecoveryCodesResponse['data'] | null>(null);
  recoveryLoadError = signal<string>('');
  /**
   * Plaintext codes last returned by a one-time POST (regenerate); merged when GET omits `unused_codes`.
   * Cleared on successful GET that includes plaintext, on 404, or on destroy.
   */
  recoveryPlaintextEphemeral = signal<string[] | null>(null);

  mfaSupported = signal<string[]>([]);
  /** User confirmed regeneration (single-session guard). */
  regenerateArmed = signal(false);

  passkeysSupported = signal(false);

  readonly totpQrDataUrl = signal<string | null>(null);

  readonly renameDrafts = signal<Record<string, string>>({});

  readonly otherAuthenticators = computed(() =>
    this.authenticators().filter((a) => a.type !== 'webauthn')
  );

  readonly webauthnAuthenticators = computed(() =>
    this.authenticators().filter(
      (a): a is Extract<AuthenticatorListItem, { type: 'webauthn' }> => a.type === 'webauthn'
    )
  );

  /** Normalized list for display (always an array; never read optional API field raw in templates). */
  readonly recoveryPlaintextCodes = computed(() =>
    this.normalizeUnusedCodes(this.recoveryData()?.unused_codes)
  );

  readonly recoveryHasPlaintext = computed(() => this.recoveryPlaintextCodes().length > 0);

  /** Codes exist but API no longer returns plaintext until next regenerate. */
  readonly recoveryShowRedactedGuidance = computed(() => {
    const rc = this.recoveryData();
    if (!rc || this.recoveryHasPlaintext()) {
      return false;
    }
    return (rc.unused_code_count ?? 0) > 0;
  });

  /** Authenticator has no unused codes left; user should regenerate. */
  readonly recoveryShowAllUsedGuidance = computed(() => {
    const rc = this.recoveryData();
    if (!rc || this.recoveryHasPlaintext()) {
      return false;
    }
    const unused = rc.unused_code_count ?? 0;
    const total = rc.total_code_count ?? 0;
    return unused === 0 && total > 0;
  });

  /**
   * Plaintext is visible because we kept the last one-time POST payload for this page visit
   * (GET omitted `unused_codes`). Ephemeral is cleared after a GET that returns plaintext.
   */
  readonly recoveryShowSessionRevealBanner = computed(
    () => this.recoveryHasPlaintext() && (this.recoveryPlaintextEphemeral()?.length ?? 0) > 0
  );

  /** General reminder when codes are shown from GET (one-time / may not repeat). */
  readonly recoveryShowOneTimeFromApiHint = computed(
    () => this.recoveryHasPlaintext() && (this.recoveryPlaintextEphemeral()?.length ?? 0) === 0
  );

  /** True if navigated away (email must be verified before MFA / account actions). */
  private redirectIfUnverifiedEmail(e: HttpErrorResponse): boolean {
    if (!isUnverifiedEmailError(e)) {
      return false;
    }
    void this.router.navigate([AUTH_ROUTES.verifyEmail], {
      queryParams: { reason: 'unverified_email', from: 'security' },
    });
    return true;
  }

  ngOnInit(): void {
    this.passkeysSupported.set(isPasskeyClientEnvironmentSupported());
    void this.reloadAll();
  }

  ngOnDestroy(): void {
    this.recoveryPlaintextEphemeral.set(null);
  }

  private normalizeUnusedCodes(raw: unknown): string[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.filter((c): c is string => typeof c === 'string');
  }

  /**
   * @param source `get` — server read: plaintext means ephemeral cache can be dropped.
   *   `regeneratePost` — one-time create response: keep plaintext in ephemeral so a follow-up
   *   redacted GET can still merge and show codes until the user leaves the page.
   */
  private applyRecoveryPayload(
    data: RecoveryCodesResponse['data'],
    source: 'get' | 'regeneratePost' = 'get'
  ): void {
    const fromApi = this.normalizeUnusedCodes(data.unused_codes);
    const base: RecoveryCodesResponse['data'] = { ...data, unused_codes: fromApi };
    if (fromApi.length > 0) {
      if (source === 'get') {
        this.recoveryPlaintextEphemeral.set(null);
      } else {
        this.recoveryPlaintextEphemeral.set(fromApi);
      }
      this.recoveryData.set(base);
      return;
    }
    if (source === 'regeneratePost') {
      this.recoveryPlaintextEphemeral.set(null);
    }
    const ephem = this.recoveryPlaintextEphemeral();
    if (ephem && ephem.length > 0) {
      this.recoveryData.set({ ...base, unused_codes: ephem });
      return;
    }
    this.recoveryData.set(base);
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
      this.syncRenameDraftsFromList(list.data ?? []);

      const totp = await firstValueFrom(this.auth.headlessAuth.getTotpStatus());
      this.totpState.set(totp);
      await this.refreshTotpQr();

      if (totp.kind === 'active' || list.data.some((a) => a.type === 'recovery_codes')) {
        await this.loadRecoveryCodesSilently();
      } else {
        this.recoveryData.set(null);
        this.recoveryPlaintextEphemeral.set(null);
      }
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        if (tryNavigateForAuth401(this.router, e)) {
          return;
        }
        if (this.redirectIfUnverifiedEmail(e)) {
          return;
        }
        this.pageError.set(
          resolveAuthErrorMessage(
            e,
            { fallbackKey: 'AUTH.SECURITY.LOAD_ERROR', context: 'security' },
            this.translate
          )
        );
      } else {
        this.pageError.set(this.translate.instant('AUTH.SECURITY.LOAD_ERROR'));
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  private syncRenameDraftsFromList(items: AuthenticatorListItem[]): void {
    const next: Record<string, string> = {};
    for (const a of items) {
      if (a.type === 'webauthn') {
        next[a.id] = a.name;
      }
    }
    this.renameDrafts.set(next);
  }

  private async refreshTotpQr(): Promise<void> {
    const ts = this.totpState();
    if (!ts || ts.kind !== 'pending_setup') {
      this.totpQrDataUrl.set(null);
      return;
    }
    try {
      const QRCode = (await import('qrcode')).default;
      const dataUrl = await QRCode.toDataURL(ts.meta.totp_url, {
        width: 220,
        margin: 1,
        errorCorrectionLevel: 'M',
      });
      this.totpQrDataUrl.set(dataUrl);
    } catch {
      this.totpQrDataUrl.set(null);
    }
  }

  patchRenameDraft(id: string, value: string): void {
    this.renameDrafts.update((m) => ({ ...m, [id]: value }));
  }

  async savePasskeyName(id: string): Promise<void> {
    const name = (this.renameDrafts()[id] ?? '').trim();
    if (!name) {
      return;
    }
    this.pageError.set('');
    this.isLoading.set(true);
    try {
      await firstValueFrom(this.auth.headlessAuth.updateWebauthnCredential(id, { name }));
      await this.reloadAll();
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        if (tryNavigateForAuth401(this.router, e)) {
          return;
        }
        if (this.redirectIfUnverifiedEmail(e)) {
          return;
        }
        this.pageError.set(
          resolveAuthErrorMessage(
            e,
            { fallbackKey: 'AUTH.SECURITY.PASSKEY_RENAME_ERROR', context: 'security' },
            this.translate
          )
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  async deletePasskey(id: string): Promise<void> {
    if (!confirm(this.translate.instant('AUTH.SECURITY.PASSKEY_DELETE_CONFIRM'))) {
      return;
    }
    this.pageError.set('');
    this.isLoading.set(true);
    try {
      await firstValueFrom(this.auth.headlessAuth.deleteWebauthnCredential([id]));
      await this.reloadAll();
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        if (tryNavigateForAuth401(this.router, e)) {
          return;
        }
        if (this.redirectIfUnverifiedEmail(e)) {
          return;
        }
        this.pageError.set(
          resolveAuthErrorMessage(
            e,
            { fallbackKey: 'AUTH.SECURITY.PASSKEY_DELETE_ERROR', context: 'security' },
            this.translate
          )
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadRecoveryCodesSilently(): Promise<void> {
    this.recoveryLoadError.set('');
    try {
      const res = await firstValueFrom(this.auth.headlessAuth.getRecoveryCodes());
      this.applyRecoveryPayload(res.data, 'get');
    } catch (e) {
      if (e instanceof HttpErrorResponse && e.status === 404) {
        this.recoveryData.set(null);
        this.recoveryPlaintextEphemeral.set(null);
        return;
      }
      if (e instanceof HttpErrorResponse) {
        if (this.redirectIfUnverifiedEmail(e)) {
          return;
        }
        this.recoveryLoadError.set(
          resolveAuthErrorMessage(
            e,
            { fallbackKey: 'AUTH.SECURITY.RECOVERY_LOAD_ERROR', context: 'security' },
            this.translate
          )
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
    const codes = this.recoveryPlaintextCodes();
    if (!codes.length) {
      return;
    }
    await this.copyText(codes.join('\n'));
  }

  downloadRecoveryCodes(): void {
    const codes = this.recoveryPlaintextCodes();
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
      this.applyRecoveryPayload(res.data, 'regeneratePost');
      this.regenerateArmed.set(false);
      await this.reloadAll();
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        if (tryNavigateForAuth401(this.router, e)) {
          return;
        }
        if (this.redirectIfUnverifiedEmail(e)) {
          return;
        }
        this.pageError.set(
          resolveAuthErrorMessage(
            e,
            { fallbackKey: 'AUTH.SECURITY.RECOVERY_REGEN_ERROR', context: 'security' },
            this.translate
          )
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
      await this.reloadAll();
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        if (tryNavigateForAuth401(this.router, e)) {
          this.isLoading.set(false);
          return;
        }
        if (this.redirectIfUnverifiedEmail(e)) {
          this.isLoading.set(false);
          return;
        }
        this.pageError.set(
          resolveAuthErrorMessage(
            e,
            { fallbackKey: 'AUTH.SECURITY.TOTP_ACTIVATE_ERROR', context: 'security' },
            this.translate
          )
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
        if (this.redirectIfUnverifiedEmail(e)) {
          return;
        }
        this.pageError.set(
          resolveAuthErrorMessage(
            e,
            { fallbackKey: 'AUTH.SECURITY.TOTP_DEACTIVATE_ERROR', context: 'security' },
            this.translate
          )
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }
}
