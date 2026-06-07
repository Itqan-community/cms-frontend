import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { AuthService } from '../../../core/auth/services/auth.service';
import { NAV_LINKS } from '../../../core/constants/nav-links';
import { PORTAL_PERMISSIONS } from '../../../features/admin/constants/portal-permission.constants';
import { AdminAuthService } from '../../../features/admin/services/admin-auth.service';
import { isPublisherHost } from '../../utils/publisherhost.util';
import { LangSwitchComponent } from '../lang-switch/lang-switch.component';
import { MobileMenuComponent } from '../mobile-menu/mobile-menu.component';
import {
  NavigationLink,
  NavigationMenuComponent,
} from '../navigation-menu/navigation-menu.component';
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
    NgIcon,
  ],
  styleUrls: ['./header.component.less'],
  templateUrl: './header.component.html',
})
export class HeaderComponent {
  public readonly authService = inject(AuthService);
  private readonly adminAuth = inject(AdminAuthService);
  readonly isPublisherHost = isPublisherHost();

  readonly navLinks = computed((): NavigationLink[] => {
    const showAdmin = this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_ACCESS);
    return NAV_LINKS.filter((l) => l.link !== '/admin' || showAdmin);
  });

  isMobileMenuOpen = signal(false);

  onMobileMenuToggle(): void {
    this.isMobileMenuOpen.update((v) => !v);
  }

  onLogout(): void {
    this.authService.logout().subscribe();
  }
}
