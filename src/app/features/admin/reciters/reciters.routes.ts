import { Routes } from '@angular/router';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { permissionGuard } from '../guards/permission.guard';
import { RecitersLayoutComponent } from './reciters-layout.component';

export const reciterRoutes: Routes = [
  {
    path: '',
    component: RecitersLayoutComponent,
    children: [
      {
        path: '',
        canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_RECITER] })],
        loadComponent: () =>
          import('./components/reciters-list/reciters-list.component').then(
            (m) => m.RecitersListComponent
          ),
      },
      {
        path: 'create',
        canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_CREATE_RECITER] })],
        loadComponent: () =>
          import('./components/reciter-form/reciter-form.component').then(
            (m) => m.ReciterFormComponent
          ),
      },
      {
        path: ':slug/edit',
        canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_UPDATE_RECITER] })],
        loadComponent: () =>
          import('./components/reciter-form/reciter-form.component').then(
            (m) => m.ReciterFormComponent
          ),
      },
      {
        path: ':slug',
        canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_RECITER] })],
        loadComponent: () =>
          import('./components/reciter-detail/reciter-detail.component').then(
            (m) => m.ReciterDetailComponent
          ),
      },
    ],
  },
];
