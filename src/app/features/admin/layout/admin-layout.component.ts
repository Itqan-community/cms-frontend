import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { AuthService } from '../../../core/auth/services/auth.service';
import { LangSwitchComponent } from '../../../shared/components/lang-switch/lang-switch.component';
import { UserActionsComponent } from '../../../shared/components/user-actions/user-actions.component';
import { isPublisherHost } from '../../../shared/utils/publisherhost.util';
import { AdminTenantService } from '../services/admin-tenant.service';
import {
  resolveUrlAfterTenantChange,
} from '../utils/admin-tenant-navigation.util';
import { AdminTenantNavigationService } from '../services/admin-tenant-navigation.service';
import { AdminSidebarComponent } from './admin-sidebar.component';


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
    AdminSidebarComponent,
  ],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.less'],
})
export class AdminLayoutComponent implements OnInit {
  private readonly modal = inject(NzModalService);
  private readonly router = inject(Router);
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

  private isMobileViewport(): boolean {
    return window.innerWidth < 992;
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


}
