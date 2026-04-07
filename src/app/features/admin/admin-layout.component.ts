import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
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
  emoji: string;
}

const TAB_MUSHAFS: CmsTab = {
  id: 'mushafs',
  path: 'mushafs',
  label: 'ADMIN.MENU.MUSHAFS',
  emoji: '📖',
};
const TAB_TAFSIRS: CmsTab = {
  id: 'tafsirs',
  path: 'tafsirs',
  label: 'ADMIN.MENU.TAFSIRS',
  emoji: '📚',
};
const TAB_TRANSLATIONS: CmsTab = {
  id: 'translations',
  path: 'translations',
  label: 'ADMIN.MENU.TRANSLATIONS',
  emoji: '🌍',
};
const TAB_PUBLISHERS: CmsTab = {
  id: 'publishers',
  path: 'publishers',
  label: 'ADMIN.MENU.PUBLISHERS',
  emoji: '📰',
};
const TAB_RECITATIONS: CmsTab = {
  id: 'recitations',
  path: 'recitations',
  label: 'ADMIN.MENU.RECITATIONS',
  emoji: '🎵',
};
const TAB_RECITERS: CmsTab = {
  id: 'reciters',
  path: 'reciters',
  label: 'ADMIN.MENU.RECITERS',
  emoji: '🔊',
};
const TAB_PROFILE: CmsTab = {
  id: 'profile',
  path: 'profile',
  label: 'ADMIN.MENU.MANAGE_PROFILE',
  emoji: '🪪',
};

const CORE_TABS: CmsTab[] = [
  TAB_MUSHAFS,
  TAB_TAFSIRS,
  TAB_TRANSLATIONS,
  TAB_RECITATIONS,
  TAB_RECITERS,
];

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    NzModalModule,
    RouterLink,
    RouterOutlet,
    NzLayoutModule,
    NzMenuModule,
    NzIconModule,
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

  readonly layoutDir = signal<'rtl' | 'ltr'>(
    this.translate.getCurrentLang() === 'ar' ? 'rtl' : 'ltr'
  );

  readonly tabs = computed(() => {
    // if (this.adminAuth.isItqanAdmin()) {
    //   return [TAB_MUSHAFS, TAB_TAFSIRS, TAB_TRANSLATIONS, TAB_PUBLISHERS, TAB_AUDIO];
    // }
    // if (this.adminAuth.isPublisherAdmin()) {
    return [TAB_PROFILE, ...CORE_TABS, TAB_PUBLISHERS];
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
}
