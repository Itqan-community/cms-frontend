import { Routes } from '@angular/router';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { permissionGuard } from '../guards/permission.guard';
import { RecitationsLayoutComponent } from './recitations-layout.component';
import { recitationDetailCanDeactivate } from './components/recitation-detail/recitation-detail.can-deactivate';

export const recitationRoutes: Routes = [
  {
    path: '',
    component: RecitationsLayoutComponent,
    children: [
      {
        path: '',
        canActivate: [
          permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_RECITATION] }),
        ],
        loadComponent: () =>
          import('./components/recitations-list/recitations-list.component').then(
            (m) => m.RecitationsListComponent
          ),
      },
      {
        path: 'create',
        canActivate: [
          permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_CREATE_RECITATION] }),
        ],
        loadComponent: () =>
          import('./components/recitation-form/recitation-form.component').then(
            (m) => m.RecitationFormComponent
          ),
      },
      {
        path: ':slug/edit',
        canActivate: [
          permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_UPDATE_RECITATION] }),
        ],
        loadComponent: () =>
          import('./components/recitation-form/recitation-form.component').then(
            (m) => m.RecitationFormComponent
          ),
      },
      {
        path: ':slug',
        canActivate: [
          permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_RECITATION] }),
        ],
        canDeactivate: [recitationDetailCanDeactivate],
        loadComponent: () =>
          import('./components/recitation-detail/recitation-detail.component').then(
            (m) => m.RecitationDetailComponent
          ),
      },
    ],
  },
];
