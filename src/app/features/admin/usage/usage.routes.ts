import { Routes } from '@angular/router';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { permissionGuard } from '../guards/permission.guard';

export const usageRoutes: Routes = [
  {
    path: '',
    canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_ACCESS] })],
    loadComponent: () =>
      import('./pages/usage-page/usage-page.component').then((m) => m.UsagePageComponent),
  },
];
