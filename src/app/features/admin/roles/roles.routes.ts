import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { AdminAuthService } from '../services/admin-auth.service';

/** Roles are only visible to holders of portal_read_group (today: Itqan staff). */
export const rolesAccessGuard: CanActivateFn = () => {
  const adminAuth = inject(AdminAuthService);
  if (adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_READ_GROUP)) {
    return true;
  }
  return inject(Router).createUrlTree(['/unauthorized']);
};

export const rolesRoutes: Routes = [
  {
    path: '',
    canActivate: [rolesAccessGuard],
    loadComponent: () =>
      import('./components/roles-list/roles-list.component').then((m) => m.RolesListComponent),
  },
];
