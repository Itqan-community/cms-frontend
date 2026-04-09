import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { AuthService } from '../../core/auth/services/auth.service';
import { LangSwitchComponent } from '../../shared/components/lang-switch/lang-switch.component';
import { UserActionsComponent } from '../../shared/components/user-actions/user-actions.component';
import { isPublisherHost } from '../../shared/utils/publisherhost.util';
import { AdminAuthService } from './services/admin-auth.service';

interface CmsTab {
  id: string;
  path: string;
  label: string;
  icon: string;
  /** Visible in sidebar but not navigable; route redirects away. */
  disabled?: boolean;
}

const TAB_PROFILE: CmsTab = {
  id: 'profile',
  path: 'profile',
  label: 'ADMIN.MENU.MANAGE_PROFILE',
  icon: 'lucideIdCard',
  disabled: true,
};
const TAB_MUSHAFS: CmsTab = {
  id: 'mushafs',
  path: 'mushafs',
  label: 'ADMIN.MENU.MUSHAFS',
  icon: 'lucideBookOpen',
  disabled: true,
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
const CORE_TABS: CmsTab[] = [TAB_TAFSIRS, TAB_TRANSLATIONS, TAB_RECITATIONS, TAB_RECITERS];

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
    LangSwitchComponent,
    UserActionsComponent,
    TranslateModule,
  ],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.less'],
})
export class AdminLayoutComponent {
  private readonly modal = inject(NzModalService);
  private readonly adminAuth = inject(AdminAuthService);
  public readonly authService = inject(AuthService);
  private readonly translate = inject(TranslateService);
  readonly isPublisherHost = isPublisherHost();

  isCollapsed = signal(false);
  readonly isMobileMenuOpen = signal(false);

  readonly layoutDir = signal<'rtl' | 'ltr'>(
    this.translate.getCurrentLang() === 'ar' ? 'rtl' : 'ltr'
  );

  readonly tabs = computed(() => {
    // if (this.adminAuth.isItqanAdmin()) {
    //   return [TAB_MUSHAFS, TAB_TAFSIRS, TAB_TRANSLATIONS, TAB_PUBLISHERS, TAB_AUDIO];
    // }
    // if (this.adminAuth.isPublisherAdmin()) {
    return [TAB_PUBLISHERS, TAB_MUSHAFS, ...CORE_TABS];
    // }
    // return CORE_TABS;
  });

  constructor() {
    const syncDir = (): void => {
      this.layoutDir.set(this.translate.getCurrentLang() === 'ar' ? 'rtl' : 'ltr');
    };
    syncDir();
    this.translate.onLangChange.subscribe((e) => {
      this.layoutDir.set(e.lang === 'ar' ? 'rtl' : 'ltr');
    });
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
