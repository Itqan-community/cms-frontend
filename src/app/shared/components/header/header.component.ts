import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/services/auth.service';
import { NAV_LINKS } from '../../../core/constants/nav-links';
import { isPublisherHost } from '../../utils/publisherhost.util';
import { LangSwitchComponent } from '../lang-switch/lang-switch.component';
import { MobileMenuComponent } from '../mobile-menu/mobile-menu.component';
import { NavigationMenuComponent } from '../navigation-menu/navigation-menu.component';
import { UserActionsComponent } from '../user-actions/user-actions.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    LangSwitchComponent,
    NavigationMenuComponent,
    UserActionsComponent,
    MobileMenuComponent,
  ],
  styleUrls: ['./header.component.less'],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  public readonly authService = inject(AuthService);
  readonly NAV_LINKS = NAV_LINKS;
  readonly isPublisherHost = isPublisherHost();

  isMobileMenuOpen = signal(false);

  onMobileMenuToggle(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }
}
