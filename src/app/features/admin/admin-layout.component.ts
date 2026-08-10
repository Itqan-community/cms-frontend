import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { AuthService } from '../../core/auth/services/auth.service';
import { LangSwitchComponent } from '../../shared/components/lang-switch/lang-switch.component';
import { UserActionsComponent } from '../../shared/components/user-actions/user-actions.component';
import { isPublisherHost } from '../../shared/utils/publisherhost.util';
import { PORTAL_PERMISSIONS } from './constants/portal-permission.constants';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminTenantService } from './services/admin-tenant.service';
import {
  resolveUrlAfterTenantChange,
  buildSelectedPublisherDetailCommands,
} from './utils/admin-tenant-navigation.util';
import { AdminTenantNavigationService } from './services/admin-tenant-navigation.service';

interface CmsTab {
  id: string;
  path: string;
  label: string;
  icon: string;
  /** Visible in sidebar but not navigable; route redirects away. */
  disabled?: boolean;
}

const TAB_FONTS: CmsTab = {
  id: 'fonts',
  path: 'fonts',
  label: 'ADMIN.MENU.FONTS',
  icon: 'lucideType',
};
const TAB_MUSHAFS: CmsTab = {
  id: 'mushafs',
  path: 'mushafs',
  label: 'ADMIN.MENU.MUSHAFS',
  icon: 'lucideBookOpen',
};
const TAB_TAFSIRS: CmsTab = {
  id: 'tafsirs',
  path: 'tafsirs',
  label: 'ADMIN.MENU.TAFSIRS',
  icon: 'lucideGraduationCap',
};
const TAB_TRANSLATIONS: CmsTab = {
  id: 'translations',
  path: 'translations',
  label: 'ADMIN.MENU.TRANSLATIONS',
  icon: 'lucideGlobe',
};
const TAB_PUBLISHERS: CmsTab = {
  id: 'publishers',
  path: 'publishers',
  label: 'ADMIN.MENU.PUBLISHERS',
  icon: 'lucideUsers',
};
const TAB_RECITATIONS: CmsTab = {
  id: 'recitations',
  path: 'recitations',
  label: 'ADMIN.MENU.RECITATIONS',
  icon: 'lucideVolume2',
};
const TAB_RECITERS: CmsTab = {
  id: 'reciters',
  path: 'reciters',
  label: 'ADMIN.MENU.RECITERS',
  icon: 'lucideMic',
};
const TAB_ISSUES: CmsTab = {
  id: 'issues',
  path: 'issues',
  label: 'ADMIN.MENU.ISSUES',
  icon: 'lucideAlertCircle',
};
const TAB_MEMBERS: CmsTab = {
  id: 'members',
  path: 'members',
  label: 'ADMIN.MENU.MEMBERS',
  icon: 'lucideUserCog',
};
const TAB_ACCESS_REQUESTS: CmsTab = {
  id: 'access-requests',
  path: 'access-requests',
  label: 'ADMIN.MENU.ACCESS_REQUESTS',
  icon: 'lucideKeyRound',
};
const TAB_USAGE: CmsTab = {
  id: 'usage',
  path: 'usage',
  label: 'ADMIN.MENU.USAGE',
  icon: 'lucideBarChart2',
};

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    NzModalModule,
    RouterLink,
    RouterOutlet,
    NzLayoutModule,
    NzMenuModule,
    NgIcon,
    FormsModule,
    NzSelectModule,
    LangSwitchComponent,
    UserActionsComponent,
    TranslateModule,
  ],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.less'],
})
export class AdminLayoutComponent implements OnInit {
  private readonly modal = inject(NzModalService);
  private readonly router = inject(Router);
  private readonly adminAuth = inject(AdminAuthService);
  private readonly tenantNavigation = inject(AdminTenantNavigationService);
  public readonly authService = inject(AuthService);
  public readonly tenantService = inject(AdminTenantService);
  private readonly translate = inject(TranslateService);
  readonly isPublisherHost = isPublisherHost();

  isCollapsed = signal(false);
  readonly isMobileMenuOpen = signal(false);

  readonly layoutDir = signal<'rtl' | 'ltr'>(
    this.translate.getCurrentLang() === 'ar' ? 'rtl' : 'ltr'
  );

  private readonly destroyRef = inject(DestroyRef);

  readonly tabs = computed(() => {
    const tabs: CmsTab[] = [];
    if (this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_READ_PUBLISHER)) {
      tabs.push(TAB_PUBLISHERS);
    }
    if (this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_READ_TAFSIR)) {
      tabs.push(TAB_TAFSIRS);
    }
    if (this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_READ_TRANSLATION)) {
      tabs.push(TAB_TRANSLATIONS);
    }
    if (this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_READ_MUSHAF)) {
      tabs.push(TAB_MUSHAFS);
    }
    if (this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_READ_FONT)) {
      tabs.push(TAB_FONTS);
    }
    if (this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_READ_RECITATION)) {
      tabs.push(TAB_RECITATIONS);
    }
    if (this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_READ_RECITER)) {
      tabs.push(TAB_RECITERS);
    }
    // TODO(backend-permissions): gate with PORTAL_PERMISSIONS.PORTAL_READ_ISSUE_REPORT once seeded
    // if (this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_READ_ISSUE_REPORT)) {
    tabs.push(TAB_ISSUES);
    // }
    if (
      this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_VIEW_PUBLISHER_MEMBERS) ||
      this.adminAuth.isItqanAdmin()
    ) {
      tabs.push(TAB_MEMBERS);
    }
    if (
      this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_VIEW_ACCESS_REQUESTS) ||
      this.adminAuth.isItqanAdmin()
    ) {
      tabs.push(TAB_ACCESS_REQUESTS);
    }
    if (this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_ACCESS)) {
      tabs.push(TAB_USAGE);
    }
    return tabs;
  });

  constructor() {
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
      this.layoutDir.set(e.lang === 'ar' ? 'rtl' : 'ltr');
    });
  }

  ngOnInit(): void {
    this.tenantService.ensureReady().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
  }

  onMobileMenuToggle(): void {
    if (!this.isMobileViewport()) return;
    const open = !this.isMobileMenuOpen();
    this.isMobileMenuOpen.set(open);
    this.isCollapsed.set(!open);
  }

  closeMobileMenu(): void {
    if (this.isMobileViewport()) {
      this.isMobileMenuOpen.set(false);
      this.isCollapsed.set(true);
    }
  }

  onSiderCollapsedChange(collapsed: boolean): void {
    this.isCollapsed.set(collapsed);
    if (this.isMobileViewport()) {
      this.isMobileMenuOpen.set(!collapsed);
    }
  }

  onMenuItemClick(): void {
    this.closeMobileMenu();
  }

  tabRouterLink(tab: CmsTab): (string | number)[] {
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

  onLogout(): void {
    this.authService.logout().subscribe();
  }

  onTenantChange(publisherId: number): void {
    if (publisherId === this.tenantService.getSelectedPublisherId()) {
      return;
    }
    if (this.tenantService.setSelectedPublisherId(publisherId)) {
      const target = resolveUrlAfterTenantChange(this.router.url, publisherId);
      this.tenantNavigation.assign(target);
    }
  }

  onRefresh(): void {
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.REFRESH_PROMPT.TITLE'),
      nzContent: this.translate.instant('ADMIN.REFRESH_PROMPT.CONTENT'),
      nzOkText: this.translate.instant('ADMIN.REFRESH_PROMPT.OK'),
      nzCancelText: this.translate.instant('ADMIN.REFRESH_PROMPT.CANCEL'),
      nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
      nzOnOk: () => {
        // Refresh logic here
      },
    });
  }

  private isMobileViewport(): boolean {
    return window.innerWidth < 992;
  }
}
