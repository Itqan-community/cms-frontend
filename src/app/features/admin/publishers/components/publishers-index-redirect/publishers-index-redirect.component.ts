import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AdminTenantService } from '../../../services/admin-tenant.service';
import { buildSelectedPublisherDetailCommands } from '../../../utils/admin-tenant-navigation.util';

/** Sends `/admin/publishers` to the currently selected publisher detail page. */
@Component({
  selector: 'app-publishers-index-redirect',
  standalone: true,
  template: '',
})
export class PublishersIndexRedirectComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly tenantService = inject(AdminTenantService);

  ngOnInit(): void {
    const commands = buildSelectedPublisherDetailCommands(
      this.tenantService.getSelectedPublisherId()
    );
    if (commands) {
      void this.router.navigate(commands, { replaceUrl: true });
    }
  }
}
