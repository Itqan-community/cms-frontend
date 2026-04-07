import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';

/**
 * Entry point for publisher admins: account/profile until publisher-scoped CRUD is wired.
 */
@Component({
  standalone: true,
  selector: 'app-publisher-admin-profile-page',
  imports: [RouterLink, TranslatePipe, NzCardModule, NzButtonModule],
  template: `
    <nz-card>
      <h2 class="admin-profile-heading">{{ 'ADMIN.PROFILE.TITLE' | translate }}</h2>
      <p>{{ 'ADMIN.PROFILE.HINT' | translate }}</p>
      <a nz-button nzType="primary" routerLink="/complete-profile">{{
        'ADMIN.PROFILE.EDIT_ACCOUNT' | translate
      }}</a>
    </nz-card>
  `,
  styles: [
    `
      .admin-profile-heading {
        margin: 0 0 12px;
        font-size: 18px;
        font-weight: 600;
        color: var(--admin-text-900);
      }
    `,
  ],
})
export class PublisherAdminProfilePage {}
