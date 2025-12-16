import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NavigationMenuComponent } from '../navigation-menu/navigation-menu.component';
import { UserActionsComponent } from '../user-actions/user-actions.component';
import { NAV_LINKS } from '../../../core/constants/nav-links';
import { LangSwitchComponent } from '../lang-switch/lang-switch.component';
import { AuthService } from '../../../core/auth/services/auth.service';
import { isPublisherHost } from '../../utils/publisherhost.util';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, LangSwitchComponent, NavigationMenuComponent, UserActionsComponent],
  styleUrls: ['./header.component.less'],
  template: `
    <header class="app-header">
      <div class="app-header__container">
        <div class="app-header__row">
          <!-- Logo and Navigation -->
          <div class="app-header__brand">
            <a class="app-header__logo" [routerLink]="['/']">
              @if (isPublisherHost) {
                <!-- Mock Publisher Logo -->
                <div class="publisher-logo">
                  <svg
                    width="120"
                    height="40"
                    viewBox="0 0 120 40"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect width="120" height="40" rx="4" fill="#4F46E5" />
                    <text
                      x="60"
                      y="24"
                      font-family="Arial"
                      font-size="16"
                      font-weight="bold"
                      fill="white"
                      text-anchor="middle"
                    >
                      Publisher
                    </text>
                  </svg>
                </div>
              } @else {
                <img
                  alt="Itqan CMS"
                  loading="lazy"
                  width="120"
                  height="40"
                  decoding="async"
                  class="app-header__logo-img"
                  src="assets/images/logo.svg"
                />
              }
            </a>
            <app-navigation-menu [links]="NAV_LINKS"></app-navigation-menu>
          </div>

          <!-- Actions -->
          <div class="app-header__actions">
            <!-- Desktop Actions -->
            <div class="app-header__actions-desktop">
              <app-lang-switch></app-lang-switch>
              <app-user-actions (logoutClicked)="authService.logout()"></app-user-actions>
            </div>

            <!-- Mobile Menu Button -->
            <div class="app-header__actions-mobile">
              <button ((click))="onMobileMenuToggle()" class="app-header__menu-btn">
                <i class="bx bx-menu"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  `,
})
export class HeaderComponent {
  public readonly authService = inject(AuthService);
  readonly NAV_LINKS = NAV_LINKS;
  readonly isPublisherHost = isPublisherHost();

  onMobileMenuToggle(): void {
    // TODO: Implement mobile menu toggle functionality
    console.log('Mobile menu toggled');
  }
}
