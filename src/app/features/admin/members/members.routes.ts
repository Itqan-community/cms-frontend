import { inject } from '@angular/core';
import { CanActivateFn, Routes, Router } from '@angular/router';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { AdminAuthService } from '../services/admin-auth.service';
import { MembersLayoutComponent } from './members-layout.component';

const membersAccessGuard: CanActivateFn = () => {
  const adminAuth = inject(AdminAuthService);
  const router = inject(Router);
  if (
    adminAuth.isItqanAdmin() ||
    adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_VIEW_PUBLISHER_MEMBERS)
  ) {
    return true;
  }
  return router.createUrlTree(['/unauthorized']);
};

export const membersRoutes: Routes = [
  {
    path: '',
    component: MembersLayoutComponent,
    children: [
      {
        path: '',
        canActivate: [membersAccessGuard],
        loadComponent: () =>
          import('./components/members-list/members-list.component').then(
            (m) => m.MembersListComponent
          ),
      },
    ],
  },
];
