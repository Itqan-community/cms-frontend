import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { AuthService } from '../../core/auth/services/auth.service';
import { LangSwitchComponent } from '../../shared/components/lang-switch/lang-switch.component';
import { UserActionsComponent } from '../../shared/components/user-actions/user-actions.component';
import { isPublisherHost } from '../../shared/utils/publisherhost.util';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AdminAuthService } from './services/admin-auth.service';

interface CmsTab {
  id: string;
  path: string;
  label: string;
  emoji: string;
}

const ALL_TABS: CmsTab[] = [
  // { id: 'search', path: 'search', label: 'ADMIN.MENU.SEARCH', emoji: '🔍' },
  { id: 'mushafs', path: 'mushafs', label: 'ADMIN.MENU.MUSHAFS', emoji: '📖' },
  // { id: 'fonts', path: 'fonts', label: 'ADMIN.MENU.FONTS', emoji: '✏️' },
  { id: 'tafsirs', path: 'tafsirs', label: 'ADMIN.MENU.TAFSIRS', emoji: '📚' },
  { id: 'translations', path: 'translations', label: 'ADMIN.MENU.TRANSLATIONS', emoji: '🌍' },
  // { id: 'linguistics', path: 'linguistics', label: 'ADMIN.MENU.LINGUISTICS', emoji: '🌐' },
  // { id: 'tajweed', path: 'tajweed', label: 'ADMIN.MENU.TAJWEED', emoji: '🎓' },
  { id: 'publishers', path: 'publishers', label: 'ADMIN.MENU.PUBLISHERS', emoji: '📰' },
  { id: 'audio', path: 'audio', label: 'ADMIN.MENU.AUDIO', emoji: '🔊' },
  // { id: 'software', path: 'software', label: 'ADMIN.MENU.SOFTWARE', emoji: '💻' },
];

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    NzModalModule,
    RouterLink,
    RouterLinkActive,
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

  readonly tabs = computed(() => {
    // if (this.adminAuth.isItqanAdmin()) {
    return ALL_TABS;
    // }
    // Publisher admin sees all except publishers tab
    // return ALL_TABS.filter((t) => t.id !== 'publishers');
  });

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
