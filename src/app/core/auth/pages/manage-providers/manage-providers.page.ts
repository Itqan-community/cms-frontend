import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { pathForPendingFlow } from '../../headless/allauth-auth.hooks';
import type { AuthenticatedOrChallenge } from '../../headless/headless-auth-api.service';
import {
  ConnectedProviderAccountRow,
  parseProviderAccountsEnvelope,
} from '../../headless/headless-account-data.util';
import { getGsiGoogle } from '../../headless/google-gsi.types';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { AuthService } from '../../services/auth.service';
import { buildHeadlessConnectOAuthCallbackUrl } from '../../utils/auth-route-query.util';
import { headlessMessageLooksLikeProviderAccountInUse } from '../../utils/oauth-callback-error.util';
import { isOauthReturnSessionEstablished } from '../../utils/oauth-callback-session.util';

@Component({
  standalone: true,
  selector: 'app-manage-providers-page',
  imports: [CommonModule, RouterLink, TranslateModule, LangSwitchComponent],
  styleUrls: ['./manage-providers.page.less'],
  templateUrl: './manage-providers.page.html',
})
export class ManageProvidersPage implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly googleConnectHost = viewChild<ElementRef<HTMLDivElement>>('googleConnectHost');

  readonly accounts = signal<ConnectedProviderAccountRow[]>([]);
  readonly isLoading = signal(false);
  readonly pageError = signal('');
  readonly successMsg = signal('');

  private googleConnectMountAttempted = false;

  constructor() {
    afterNextRender(() => {
      void this.tryMountGoogleConnectButton();
    });
  }

  ngOnInit(): void {
    void this.reload();
  }

  ngOnDestroy(): void {
    getGsiGoogle()?.accounts?.id?.cancel?.();
  }

  /** Headless `callback_url` after provider consent — land back on this page. */
  get oauthConnectCallbackUrl(): string {
    return buildHeadlessConnectOAuthCallbackUrl('/account/providers');
  }

  private async tryMountGoogleConnectButton(): Promise<void> {
    if (!this.auth.socialGoogleUseAppTokenConfigured() || this.googleConnectMountAttempted) {
      return;
    }
    const el = this.googleConnectHost()?.nativeElement;
    if (!el) {
      return;
    }
    this.googleConnectMountAttempted = true;
    const lang = localStorage.getItem('lang') ?? undefined;
    await this.auth.mountGoogleSignInButton(el, 'connect', {
      locale: lang === 'ar' ? 'ar' : 'en',
      onNext: (envelope: AuthenticatedOrChallenge) => this.onGoogleConnectTokenResult(envelope),
      onError: (m) => this.pageError.set(m),
    });
  }

  private onGoogleConnectTokenResult(envelope: AuthenticatedOrChallenge): void {
    this.pageError.set('');
    const pendingPath = pathForPendingFlow(envelope);
    if (pendingPath) {
      void this.router.navigate([pendingPath], {
        queryParams: { next: '/account/providers' },
      });
      return;
    }
    if (isOauthReturnSessionEstablished(envelope)) {
      this.successMsg.set(this.translate.instant('AUTH.PROVIDERS.CONNECT_SUCCESS'));
      void this.reload();
      return;
    }
    this.pageError.set(this.translate.instant('AUTH.OAUTH.ERROR'));
  }

  connectGoogle(): void {
    void this.connectProvider('google');
  }

  connectGitHub(): void {
    void this.connectProvider('github');
  }

  private async connectProvider(provider: 'google' | 'github'): Promise<void> {
    this.pageError.set('');
    if (provider === 'google' && this.auth.socialGoogleUseAppTokenConfigured()) {
      return;
    }
    const result =
      provider === 'google'
        ? await this.auth.startGoogleOAuth(this.oauthConnectCallbackUrl, 'connect')
        : await this.auth.startGitHubOAuth(this.oauthConnectCallbackUrl, 'connect');
    if (result.kind !== 'error') {
      return;
    }
    if (headlessMessageLooksLikeProviderAccountInUse(result.message)) {
      this.pageError.set(this.translate.instant('AUTH.OAUTH.PROVIDER_ACCOUNT_IN_USE'));
      return;
    }
    if (result.message.includes('cross-origin API')) {
      this.pageError.set(this.translate.instant('AUTH.PROVIDERS.CONNECT_CROSS_ORIGIN_ERROR'));
      return;
    }
    this.pageError.set(
      this.translate.instant('AUTH.PROVIDERS.CONNECT_ERROR', {
        provider: provider === 'google' ? 'Google' : 'GitHub',
      })
    );
  }

  async reload(): Promise<void> {
    this.pageError.set('');
    this.successMsg.set('');
    this.isLoading.set(true);
    try {
      const raw = await firstValueFrom(this.auth.headlessAuth.getProviderAccounts());
      this.accounts.set(parseProviderAccountsEnvelope(raw));
    } catch (e) {
      if (e instanceof HttpErrorResponse && tryNavigateForAuth401(this.router, e)) {
        return;
      }
      this.pageError.set(
        e instanceof HttpErrorResponse
          ? getErrorMessage(e) || this.translate.instant('AUTH.PROVIDERS.LOAD_ERROR')
          : this.translate.instant('AUTH.PROVIDERS.LOAD_ERROR')
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async disconnect(providerId: string, accountUid: string): Promise<void> {
    if (!confirm(this.translate.instant('AUTH.PROVIDERS.DISCONNECT_CONFIRM'))) {
      return;
    }
    this.pageError.set('');
    this.successMsg.set('');
    this.isLoading.set(true);
    try {
      await firstValueFrom(
        this.auth.headlessAuth.disconnectProviderAccount(providerId, accountUid)
      );
      this.successMsg.set(this.translate.instant('AUTH.PROVIDERS.DISCONNECT_SUCCESS'));
      await this.reload();
    } catch (e) {
      if (e instanceof HttpErrorResponse && tryNavigateForAuth401(this.router, e)) {
        return;
      }
      this.pageError.set(
        e instanceof HttpErrorResponse
          ? getErrorMessage(e) || this.translate.instant('AUTH.PROVIDERS.ACTION_ERROR')
          : this.translate.instant('AUTH.PROVIDERS.ACTION_ERROR')
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
