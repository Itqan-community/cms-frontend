import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import {
  ALLAUTH_LOGIN_REDIRECT_URL,
  authInfo,
  pathForPendingFlow,
} from '../../headless/allauth-auth.hooks';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { AuthService } from '../../services/auth.service';
import {
  oauthCallbackErrorDetailForDisplay,
  oauthCallbackErrorTranslationKey,
} from '../../utils/oauth-callback-error.util';
import { isOauthReturnSessionEstablished } from '../../utils/oauth-callback-session.util';
import { readContinueUrl } from '../../utils/auth-route-query.util';
import { getErrorMessage } from '../../../../shared/utils/error.utils';

/**
 * Social / provider return URL handler.
 * Mounted at:
 * - `/auth/oauth/callback` (existing FE)
 * - `/account/provider/callback` (django `HEADLESS_FRONTEND_URLS.socialaccount_login_error`)
 *
 * If OAuth appears stuck after the identity provider: DevTools Network, filter for the
 * django-allauth backend callback document (not fetch). Record HTTP status plus the Location
 * header — a redirect should aim at this page's CMS URL (HEADLESS redirect callback URL).
 */
@Component({
  selector: 'app-oauth-callback-page',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="wrap">
      <p>{{ message() | translate }}</p>
      @if (detail()) {
        <p class="detail">{{ detail() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .wrap {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        background: var(--color-bg);
        font-size: 16px;
        color: #333333;
        padding: 24px;
        text-align: center;
      }
      .detail {
        font-size: 14px;
        color: #666666;
        max-width: 480px;
        word-break: break-word;
      }
    `,
  ],
})
export class OauthCallbackPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  message = signal('AUTH.OAUTH.PROCESSING');
  /** Sanitized server `error_description` (not translated). */
  detail = signal<string | null>(null);

  ngOnInit(): void {
    const qpm = this.route.snapshot.queryParamMap;
    const err = qpm.get('error');
    const resumeUrl = readContinueUrl(qpm);
    const loginNav = resumeUrl !== '/gallery' ? { queryParams: { next: resumeUrl } } : undefined;

    if (err) {
      this.message.set(oauthCallbackErrorTranslationKey(qpm));
      const d = oauthCallbackErrorDetailForDisplay(qpm);
      this.detail.set(d);
      setTimeout(() => void this.router.navigate(['/account/login'], loginNav), 2000);
      return;
    }
    this.auth.bootstrapSessionAfterOAuthRedirect({ fetchProfile: true }).subscribe({
      next: (envelope) => {
        const pendingPath = pathForPendingFlow(envelope);
        if (pendingPath) {
          const extras =
            resumeUrl !== ALLAUTH_LOGIN_REDIRECT_URL && resumeUrl.startsWith('/')
              ? loginNav ?? { queryParams: { next: resumeUrl } }
              : {};
          void this.router.navigate([pendingPath], extras);
          return;
        }
        if (isOauthReturnSessionEstablished(envelope)) {
          void this.router.navigateByUrl(resumeUrl);
          return;
        }
        this.message.set('AUTH.OAUTH.ERROR');
        setTimeout(() => void this.router.navigate(['/account/login'], loginNav), 2000);
      },
      error: (e: unknown) => {
        if (e instanceof HttpErrorResponse) {
          if (tryNavigateForAuth401(this.router, e)) {
            return;
          }
        }
        this.message.set('AUTH.OAUTH.ERROR');
        setTimeout(() => void this.router.navigate(['/account/login'], loginNav), 2000);
        console.error('OAuth session:', getErrorMessage(e as object));
      },
    });
  }
}
