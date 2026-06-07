import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PORTAL_PERMISSIONS } from './constants/portal-permission.constants';
import { AdminAuthService } from './services/admin-auth.service';

/**
 * Default `/admin` child: sends the user to the first module they can access
 * (avoids redirecting non–Itqan users to `/admin/publishers`).
 */
@Component({
  selector: 'app-admin-portal-redirect',
  standalone: true,
  template: '',
})
export class AdminPortalRedirectComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly adminAuth = inject(AdminAuthService);

  ngOnInit(): void {
    if (this.adminAuth.isItqanAdmin()) {
      void this.router.navigate(['/admin', 'publishers'], { replaceUrl: true });
      return;
    }

    const candidates: { segment: string; permission: string }[] = [
      { segment: 'tafsirs', permission: PORTAL_PERMISSIONS.PORTAL_READ_TAFSIR },
      { segment: 'translations', permission: PORTAL_PERMISSIONS.PORTAL_READ_TRANSLATION },
      { segment: 'recitations', permission: PORTAL_PERMISSIONS.PORTAL_READ_RECITATION },
      { segment: 'reciters', permission: PORTAL_PERMISSIONS.PORTAL_READ_RECITER },
      // Shown in sidebar for all portal users during permission rollout; redirect only when READ is granted.
      { segment: 'issues', permission: PORTAL_PERMISSIONS.PORTAL_READ_ISSUE_REPORT },
      { segment: 'usage', permission: PORTAL_PERMISSIONS.PORTAL_ACCESS },
    ];

    for (const c of candidates) {
      if (this.adminAuth.hasPermission(c.permission)) {
        void this.router.navigate(['/admin', c.segment], { replaceUrl: true });
        return;
      }
    }

    void this.router.navigate(['/unauthorized'], { replaceUrl: true });
  }
}
