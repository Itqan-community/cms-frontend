import { CommonModule } from '@angular/common';
import { Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { isPasskeyClientEnvironmentSupported } from '../../headless/webauthn-capability.util';

export type AuthSocialFlow = 'login' | 'signup';

@Component({
  selector: 'app-auth-social-actions',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, NgIcon],
  templateUrl: './auth-social-actions.component.html',
  styleUrls: ['./auth-social-actions.component.less'],
})
export class AuthSocialActionsComponent {
  readonly flow = input.required<AuthSocialFlow>();
  readonly loginByCodeEnabled = input(false);
  readonly passkeyLoading = input(false);
  /** Optional email to pre-fill on the signup passkey page. */
  readonly passkeySignupEmail = input('');

  readonly google = output<void>();
  readonly github = output<void>();
  readonly passkey = output<void>();

  readonly passkeyAvailable = signal(false);

  constructor() {
    this.passkeyAvailable.set(isPasskeyClientEnvironmentSupported());
  }

  readonly googleLabelKey = () =>
    this.flow() === 'login' ? 'AUTH.LOGIN.LOGIN_WITH_GOOGLE' : 'AUTH.REGISTER.LOGIN_WITH_GOOGLE';

  readonly githubLabelKey = () =>
    this.flow() === 'login' ? 'AUTH.LOGIN.LOGIN_WITH_GITHUB' : 'AUTH.REGISTER.LOGIN_WITH_GITHUB';

  readonly passkeyLabelKey = () =>
    this.flow() === 'login'
      ? 'AUTH.LOGIN.SIGN_IN_WITH_PASSKEY'
      : 'AUTH.REGISTER.SIGN_UP_WITH_PASSKEY';

  onGoogleClick(): void {
    this.google.emit();
  }

  onGitHubClick(): void {
    this.github.emit();
  }

  onPasskeyClick(): void {
    this.passkey.emit();
  }

  passkeySignupQueryParams(): Record<string, string> {
    const params: Record<string, string> = { flow: 'signup' };
    const email = this.passkeySignupEmail().trim();
    if (email) {
      params['email'] = email;
    }
    return params;
  }
}
