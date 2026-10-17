import { Routes } from '@angular/router';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { permissionGuard } from '../guards/permission.guard';

/** Read-only and not publisher scoped, so any portal user may inspect it (as with usage). */
export const hierarchyRoutes: Routes = [
  {
    path: '',
    canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_ACCESS] })],
    loadComponent: () =>
      import('./components/hierarchy-manager/hierarchy-manager.component').then(
        (m) => m.HierarchyManagerComponent
      ),
  },
];
