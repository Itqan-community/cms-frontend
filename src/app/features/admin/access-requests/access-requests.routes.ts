import { inject } from '@angular/core';
import { CanActivateFn, Routes, Router } from '@angular/router';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { AdminAuthService } from '../services/admin-auth.service';
import { AccessRequestsLayoutComponent } from './access-requests-layout.component';

const accessRequestsAccessGuard: CanActivateFn = () => {
  const adminAuth = inject(AdminAuthService);
  const router = inject(Router);
  if (
    adminAuth.isItqanAdmin() ||
    adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_VIEW_ACCESS_REQUESTS)
  ) {
    return true;
  }
  return router.createUrlTree(['/unauthorized']);
};

export const accessRequestsRoutes: Routes = [
  {
    path: '',
    component: AccessRequestsLayoutComponent,
    children: [
      {
        path: '',
        canActivate: [accessRequestsAccessGuard],
        loadComponent: () =>
          import('./components/access-requests-list/access-requests-list.component').then(
            (m) => m.AccessRequestsListComponent
          ),
      },
    ],
  },
];
