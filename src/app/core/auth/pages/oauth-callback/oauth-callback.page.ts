import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { readContinueUrl } from '../../utils/auth-route-query.util';
import { getErrorMessage } from '../../../../shared/utils/error.utils';

/**
 * Social / provider return URL handler.
 * Mounted at:
 * - `/auth/oauth/callback` (existing FE)
 * - `/account/provider/callback` (django `HEADLESS_FRONTEND_URLS.socialaccount_login_error`)
 */
@Component({
  selector: 'app-oauth-callback-page',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="wrap">
      <p>{{ message() | translate }}</p>
    </div>
  `,
  styles: [
    `
      .wrap {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-bg);
        font-size: 16px;
        color: #333333;
      }
    `,
  ],
})
export class OauthCallbackPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  message = signal('AUTH.OAUTH.PROCESSING');

  ngOnInit(): void {
    const err = this.route.snapshot.queryParamMap.get('error');
    if (err) {
      this.message.set('AUTH.OAUTH.ERROR');
      setTimeout(() => void this.router.navigate(['/account/login']), 2000);
      return;
    }
    this.auth.bootstrapSessionFromServer({ fetchProfile: true }).subscribe({
      next: () => {
        const nextUrl = readContinueUrl(this.route.snapshot.queryParamMap);
        void this.router.navigateByUrl(nextUrl);
      },
      error: (e: unknown) => {
        if (e instanceof HttpErrorResponse) {
          if (tryNavigateForAuth401(this.router, e)) {
            return;
          }
        }
        this.message.set('AUTH.OAUTH.ERROR');
        setTimeout(() => void this.router.navigate(['/account/login']), 2000);
        console.error('OAuth session:', getErrorMessage(e as object));
      },
    });
  }
}
