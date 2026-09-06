import { Routes } from '@angular/router';
import { permissionGuard } from '../guards/permission.guard';
import { unsavedContentGuard } from '../guards/unsaved-content.guard';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { TafsirsLayoutComponent } from './tafsirs-layout.component';

export const tafsirRoutes: Routes = [
  {
    path: '',
    component: TafsirsLayoutComponent,
    children: [
      {
        path: '',
        canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_TAFSIR] })],
        loadComponent: () =>
          import('./components/tafsirs-list/tafsirs-list.component').then(
            (m) => m.TafsirsListComponent
          ),
      },
      {
        path: 'create',
        canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_CREATE_TAFSIR] })],
        loadComponent: () =>
          import('./components/tafsir-form/tafsir-form.component').then(
            (m) => m.TafsirFormComponent
          ),
      },
      {
        path: ':slug/edit',
        canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_UPDATE_TAFSIR] })],
        loadComponent: () =>
          import('./components/tafsir-form/tafsir-form.component').then(
            (m) => m.TafsirFormComponent
          ),
      },
      {
        path: ':slug/edit-content',
        canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_UPDATE_TAFSIR] })],
        canDeactivate: [unsavedContentGuard],
        data: { kind: 'tafsir' },
        loadComponent: () =>
          import('../components/asset-content-editor/asset-content-editor.component').then(
            (m) => m.AssetContentEditorComponent
          ),
      },
      {
        path: ':slug',
        canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_TAFSIR] })],
        loadComponent: () =>
          import('./components/tafsir-detail/tafsir-detail.component').then(
            (m) => m.TafsirDetailComponent
          ),
      },
    ],
  },
];
