import { Component, computed, inject, model } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminTenantService } from '../services/admin-tenant.service';
import { buildSelectedPublisherDetailCommands } from '../utils/admin-tenant-navigation.util';

export interface CmsTab {
  id: string;
  path: string;
  label: string;
  icon: string;
  description: string;
  /** Visible in sidebar but not navigable; route redirects away. */
  disabled?: boolean;
}

export const TAB_HOME: CmsTab = {
  id: 'home',
  path: '',
  label: 'ADMIN.MENU.HOME',
  description: 'ADMIN.MENU.HOME_DESC',
  icon: 'lucideLayoutGrid',
};

export const TAB_FONTS: CmsTab = {
  id: 'fonts',
  path: 'fonts',
  label: 'ADMIN.MENU.FONTS',
  description: 'ADMIN.MENU.FONTS_DESC',
  icon: 'lucideType',
};
export const TAB_MUSHAFS: CmsTab = {
  id: 'mushafs',
  path: 'mushafs',
  label: 'ADMIN.MENU.MUSHAFS',
  description: 'ADMIN.MENU.MUSHAFS_DESC',
  icon: 'lucideBookOpen',
};
export const TAB_TAFSIRS: CmsTab = {
  id: 'tafsirs',
  path: 'tafsirs',
  label: 'ADMIN.MENU.TAFSIRS',
  description: 'ADMIN.MENU.TAFSIRS_DESC',
  icon: 'lucideGraduationCap',
};
export const TAB_TRANSLATIONS: CmsTab = {
  id: 'translations',
  path: 'translations',
  label: 'ADMIN.MENU.TRANSLATIONS',
  description: 'ADMIN.MENU.TRANSLATIONS_DESC',
  icon: 'lucideGlobe',
};
export const TAB_PUBLISHERS: CmsTab = {
  id: 'publishers',
  path: 'publishers',
  label: 'ADMIN.MENU.PUBLISHERS',
  description: 'ADMIN.MENU.PUBLISHERS_DESC',
  icon: 'lucideUsers',
};
export const TAB_RECITATIONS: CmsTab = {
  id: 'recitations',
  path: 'recitations',
  label: 'ADMIN.MENU.RECITATIONS',
  description: 'ADMIN.MENU.RECITATIONS_DESC',
  icon: 'lucideVolume2',
};
export const TAB_RECITERS: CmsTab = {
  id: 'reciters',
  path: 'reciters',
  label: 'ADMIN.MENU.RECITERS',
  description: 'ADMIN.MENU.RECITERS_DESC',
  icon: 'lucideMic',
};
export const TAB_ISSUES: CmsTab = {
  id: 'issues',
  path: 'issues',
  label: 'ADMIN.MENU.ISSUES',
  description: 'ADMIN.MENU.ISSUES_DESC',
  icon: 'lucideAlertCircle',
};
export const TAB_MEMBERS: CmsTab = {
  id: 'members',
  path: 'members',
  label: 'ADMIN.MENU.MEMBERS',
  description: 'ADMIN.MENU.MEMBERS_DESC',
  icon: 'lucideUserCog',
};
export const TAB_ACCESS_REQUESTS: CmsTab = {
  id: 'access-requests',
  path: 'access-requests',
  label: 'ADMIN.MENU.ACCESS_REQUESTS',
  description: 'ADMIN.MENU.ACCESS_REQUESTS_DESC',
  icon: 'lucideKeyRound',
};
export const TAB_USAGE: CmsTab = {
  id: 'usage',
  path: 'usage',
  label: 'ADMIN.MENU.USAGE',
  description: 'ADMIN.MENU.USAGE_DESC',
  icon: 'lucideBarChart2',
};

export function buildAuthorizedAdminTabs(
  adminAuth: Pick<AdminAuthService, 'hasPermission' | 'isItqanAdmin'>,
  options: { includeHome?: boolean } = {}
): CmsTab[] {
  const tabs: CmsTab[] = [];
  if (options.includeHome !== false) {
    tabs.push(TAB_HOME);
  }
  if (adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_READ_PUBLISHER)) {
    tabs.push(TAB_PUBLISHERS);
  }
  if (adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_READ_TAFSIR)) {
    tabs.push(TAB_TAFSIRS);
  }
  if (adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_READ_TRANSLATION)) {
    tabs.push(TAB_TRANSLATIONS);
  }
  if (adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_READ_MUSHAF)) {
    tabs.push(TAB_MUSHAFS);
  }
  if (adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_READ_FONT)) {
    tabs.push(TAB_FONTS);
  }
  if (adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_READ_RECITATION)) {
    tabs.push(TAB_RECITATIONS);
  }
  if (adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_READ_RECITER)) {
    tabs.push(TAB_RECITERS);
  }
  // TODO(backend-permissions): gate with PORTAL_PERMISSIONS.PORTAL_READ_ISSUE_REPORT once seeded
  tabs.push(TAB_ISSUES);
  if (
    adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_VIEW_PUBLISHER_MEMBERS) ||
    adminAuth.isItqanAdmin()
  ) {
    tabs.push(TAB_MEMBERS);
  }
  if (
    adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_VIEW_ACCESS_REQUESTS) ||
    adminAuth.isItqanAdmin()
  ) {
    tabs.push(TAB_ACCESS_REQUESTS);
  }
  if (adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_ACCESS)) {
    tabs.push(TAB_USAGE);
  }
  return tabs;
}

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  host: { style: 'display: contents' },
  imports: [RouterLink, NzLayoutModule, NzMenuModule, NgIcon, TranslateModule],
  templateUrl: './admin-sidebar.component.html',
  styleUrls: ['./admin-sidebar.component.less'],
})
export class AdminSidebarComponent {
  private readonly adminAuth = inject(AdminAuthService);
  public readonly tenantService = inject(AdminTenantService);

  readonly isCollapsed = model.required<boolean>();
  readonly isMobileMenuOpen = model.required<boolean>();

  readonly tabs = computed(() => buildAuthorizedAdminTabs(this.adminAuth));

  onSiderCollapsedChange(collapsed: boolean): void {
    this.isCollapsed.set(collapsed);
    if (this.isMobileViewport()) {
      this.isMobileMenuOpen.set(!collapsed);
    }
  }

  closeMobileMenu(): void {
    if (this.isMobileViewport()) {
      this.isMobileMenuOpen.set(false);
      this.isCollapsed.set(true);
    }
  }

  onMenuItemClick(): void {
    this.closeMobileMenu();
  }

  tabRouterLink(tab: CmsTab): (string | number)[] {
    if (tab.id === 'home' || !tab.path) {
      return ['/admin'];
    }
    if (tab.id === 'publishers') {
      const commands = buildSelectedPublisherDetailCommands(
        this.tenantService.getSelectedPublisherId()
      );
      if (commands) {
        return commands;
      }
    }
    return ['/admin', tab.path];
  }

  private isMobileViewport(): boolean {
    return window.innerWidth < 992;
  }
}
