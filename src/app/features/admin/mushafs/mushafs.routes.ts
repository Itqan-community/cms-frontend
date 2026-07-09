import { Routes } from '@angular/router';
// import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
// import { permissionGuard } from '../guards/permission.guard';
import { MushafsLayoutComponent } from './mushafs-layout.component';

/**
 * Mushafs portal assets — route guards commented until backend seeds portal_*_mushaf permissions.
 * TODO(backend-permissions): enable {@link permissionGuard} per child using PORTAL_PERMISSIONS.
 */
export const mushafRoutes: Routes = [
  {
    path: '',
    component: MushafsLayoutComponent,
    children: [
      {
        path: '',
        // canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_MUSHAF] })],
        loadComponent: () =>
          import('./components/mushafs-list/mushafs-list.component').then(
            (m) => m.MushafsListComponent
          ),
      },
      {
        path: 'create',
        // canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_CREATE_MUSHAF] })],
        loadComponent: () =>
          import('./components/mushaf-form/mushaf-form.component').then(
            (m) => m.MushafFormComponent
          ),
      },
      {
        path: ':slug/edit',
        // canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_UPDATE_MUSHAF] })],
        loadComponent: () =>
          import('./components/mushaf-form/mushaf-form.component').then(
            (m) => m.MushafFormComponent
          ),
      },
      {
        path: ':slug',
        // canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_MUSHAF] })],
        loadComponent: () =>
          import('./components/mushaf-detail/mushaf-detail.component').then(
            (m) => m.MushafDetailComponent
          ),
      },
    ],
  },
];
