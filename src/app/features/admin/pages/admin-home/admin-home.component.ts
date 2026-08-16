import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import {
  CmsTab,
  TAB_ACCESS_REQUESTS,
  TAB_FONTS,
  TAB_ISSUES,
  TAB_MEMBERS,
  TAB_MUSHAFS,
  TAB_PUBLISHERS,
  TAB_RECITATIONS,
  TAB_RECITERS,
  TAB_TAFSIRS,
  TAB_TRANSLATIONS,
  TAB_USAGE,
} from '../../admin-layout.component';
import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';
import { AdminAuthService } from '../../services/admin-auth.service';

@Component({
  selector: 'app-admin-home',
  standalone: true,
  imports: [RouterLink, NzCardModule, NzGridModule, NgIcon, TranslateModule],
  templateUrl: './admin-home.component.html',
  styleUrls: ['./admin-home.component.less'],
})
export class AdminHomeComponent {
  private readonly adminAuth = inject(AdminAuthService);

  readonly sections = computed(() => {
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
    tabs.push(TAB_ISSUES);

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

    return tabs.map((tab) => ({
      titleKey: tab.label,
      descriptionKey: tab.description,
      icon: tab.icon,
      route: `/admin/${tab.path}`,
    }));
  });
}
