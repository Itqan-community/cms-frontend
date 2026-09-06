import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { buildAuthorizedAdminTabs } from '../../layout/admin-sidebar.component';
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

  readonly sections = computed(() =>
    buildAuthorizedAdminTabs(this.adminAuth, { includeHome: false }).map((tab) => ({
      titleKey: tab.label,
      descriptionKey: tab.description,
      icon: tab.icon,
      route: `/admin/${tab.path}`,
    }))
  );
}
