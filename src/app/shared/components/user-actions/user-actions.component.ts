import { Component, inject, input, output } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NzButtonComponent } from 'ng-zorro-antd/button';
import { AuthService } from '../../../core/auth/services/auth.service';
import { UserAvatarComponent } from '../../components/user-avatar/user-avatar.component';

@Component({
  selector: 'app-user-actions',
  standalone: true,
  imports: [RouterLink, TranslatePipe, UserAvatarComponent, NzButtonComponent, NgIcon],
  styleUrls: ['./user-actions.component.less'],
  template: `
    @if (authService.isAuthenticated()) {
      <div class="user-actions">
        <a
          [routerLink]="['/account/profile']"
          class="user-actions__avatar-link"
          [title]="'NAVIGATION.ACCOUNT_PROFILE' | translate"
          [attr.aria-label]="'NAVIGATION.ACCOUNT_PROFILE' | translate"
          (click)="avatarNavigate.emit()"
        >
          <app-user-avatar [user]="authService.currentUser()" size="md"></app-user-avatar>
        </a>
        <button
          nz-button
          nzDanger
          (click)="onLogout()"
          [title]="'NAVIGATION.LOGOUT' | translate"
          class="btn__icon ant-btn-floating"
        >
          <ng-icon name="lucideLogOut" class="ltr-flip" aria-hidden="true" />
          <span class="sr-only">{{ 'NAVIGATION.LOGOUT' | translate }}</span>
        </button>
      </div>
    } @else {
      <a
        [routerLink]="['/account/login']"
        [queryParams]="loginQueryParams"
        nz-button
        class="ant-btn-floating"
      >
        {{ 'AUTH.LOGIN.SUBMIT_BUTTON' | translate }}
      </a>
    }
  `,
})
export class UserActionsComponent {
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  mobileMode = input(false);

  logoutClicked = output<void>();

  /** Mobile drawer closes when user opens account from avatar */
  avatarNavigate = output<void>();

  /** Pass the current page as `next` so login redirects back here after success. */
  get loginQueryParams(): Record<string, string> | null {
    const url = this.router.url;
    // Don't add next= when already on an auth page — it would create a circular redirect.
    if (url.startsWith('/account/') || url.startsWith('/login') || url.startsWith('/register')) {
      return null;
    }
    return { next: url };
  }

  onLogout(): void {
    this.logoutClicked.emit();
  }
}
