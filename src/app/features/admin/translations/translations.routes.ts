import { Routes } from '@angular/router';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { permissionGuard } from '../guards/permission.guard';
import { unsavedContentGuard } from '../guards/unsaved-content.guard';
import { TranslationsLayoutComponent } from './translations-layout.component';

export const translationRoutes: Routes = [
  {
    path: '',
    component: TranslationsLayoutComponent,
    children: [
      {
        path: '',
        canActivate: [
          permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_TRANSLATION] }),
        ],
        loadComponent: () =>
          import('./components/translations-list/translations-list.component').then(
            (m) => m.TranslationsListComponent
          ),
      },
      {
        path: 'create',
        canActivate: [
          permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_CREATE_TRANSLATION] }),
        ],
        loadComponent: () =>
          import('./components/translation-form/translation-form.component').then(
            (m) => m.TranslationFormComponent
          ),
      },
      {
        path: ':slug/edit',
        canActivate: [
          permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_UPDATE_TRANSLATION] }),
        ],
        loadComponent: () =>
          import('./components/translation-form/translation-form.component').then(
            (m) => m.TranslationFormComponent
          ),
      },
      {
        path: ':slug/edit-content',
        canActivate: [
          permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_UPDATE_TRANSLATION] }),
        ],
        canDeactivate: [unsavedContentGuard],
        data: { kind: 'translation' },
        loadComponent: () =>
          import('../components/asset-content-editor/asset-content-editor.component').then(
            (m) => m.AssetContentEditorComponent
          ),
      },
      {
        path: ':slug',
        canActivate: [
          permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_TRANSLATION] }),
        ],
        loadComponent: () =>
          import('./components/translation-detail/translation-detail.component').then(
            (m) => m.TranslationDetailComponent
          ),
      },
    ],
  },
];
