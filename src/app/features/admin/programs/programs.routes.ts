import { Routes } from '@angular/router';
// import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
// import { permissionGuard } from '../guards/permission.guard';
import { ProgramsLayoutComponent } from './programs-layout.component';

/**
 * Programs portal assets — route guards commented until backend seeds portal_*_program permissions.
 * TODO(backend-permissions): enable {@link permissionGuard} per child using PORTAL_PERMISSIONS.
 */
export const programRoutes: Routes = [
  {
    path: '',
    component: ProgramsLayoutComponent,
    children: [
      {
        path: '',
        // canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_PROGRAM] })],
        loadComponent: () =>
          import('./components/programs-list/programs-list.component').then(
            (m) => m.ProgramsListComponent
          ),
      },
      {
        path: 'create',
        // canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_CREATE_PROGRAM] })],
        loadComponent: () =>
          import('./components/program-form/program-form.component').then(
            (m) => m.ProgramFormComponent
          ),
      },
      {
        path: ':slug/edit',
        // canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_UPDATE_PROGRAM] })],
        loadComponent: () =>
          import('./components/program-form/program-form.component').then(
            (m) => m.ProgramFormComponent
          ),
      },
      {
        path: ':slug',
        // canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_PROGRAM] })],
        loadComponent: () =>
          import('./components/program-detail/program-detail.component').then(
            (m) => m.ProgramDetailComponent
          ),
      },
    ],
  },
];
