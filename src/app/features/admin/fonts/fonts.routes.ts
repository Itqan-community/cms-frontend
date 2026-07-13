import { Routes } from '@angular/router';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { permissionGuard } from '../guards/permission.guard';
import { FontsLayoutComponent } from './fonts-layout.component';

export const fontRoutes: Routes = [
  {
    path: '',
    component: FontsLayoutComponent,
    children: [
      {
        path: '',
        canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_FONT] })],
        loadComponent: () =>
          import('./components/fonts-list/fonts-list.component').then((m) => m.FontsListComponent),
      },
      {
        path: 'create',
        canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_CREATE_FONT] })],
        loadComponent: () =>
          import('./components/font-form/font-form.component').then((m) => m.FontFormComponent),
      },
      {
        path: ':slug/edit',
        canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_UPDATE_FONT] })],
        loadComponent: () =>
          import('./components/font-form/font-form.component').then((m) => m.FontFormComponent),
      },
      {
        path: ':slug',
        canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_FONT] })],
        loadComponent: () =>
          import('./components/font-detail/font-detail.component').then(
            (m) => m.FontDetailComponent
          ),
      },
    ],
  },
];
