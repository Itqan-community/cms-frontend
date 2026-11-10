import { Routes } from '@angular/router';
import { permissionGuard } from '../guards/permission.guard';
import { unsavedContentGuard } from '../guards/unsaved-content.guard';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { TextAssetsLayoutComponent } from './text-assets-layout.component';

export const textAssetRoutes: Routes = [
  {
    path: '',
    component: TextAssetsLayoutComponent,
    children: [
      {
        path: '',
        canActivate: [
          permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_TEXT_ASSET] }),
        ],
        loadComponent: () =>
          import('./components/text-assets-list/text-assets-list.component').then(
            (m) => m.TextAssetsListComponent
          ),
      },
      {
        path: 'create',
        canActivate: [
          permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_CREATE_TEXT_ASSET] }),
        ],
        loadComponent: () =>
          import('./components/text-asset-form/text-asset-form.component').then(
            (m) => m.TextAssetFormComponent
          ),
      },
      {
        path: ':slug/edit',
        canActivate: [
          permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_UPDATE_TEXT_ASSET] }),
        ],
        loadComponent: () =>
          import('./components/text-asset-form/text-asset-form.component').then(
            (m) => m.TextAssetFormComponent
          ),
      },
      {
        path: ':slug/edit-content',
        canActivate: [
          permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_EDIT_TEXT_ASSET_CONTENT] }),
        ],
        canDeactivate: [unsavedContentGuard],
        data: { kind: 'text' },
        loadComponent: () =>
          import('../components/asset-content-editor/asset-content-editor.component').then(
            (m) => m.AssetContentEditorComponent
          ),
      },
      {
        // Read-only view of one committed version, in the editor's table.
        path: ':slug/versions/:versionId',
        canActivate: [
          permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_TEXT_ASSET] }),
        ],
        data: { kind: 'text', readOnly: true },
        loadComponent: () =>
          import('../components/asset-content-editor/asset-content-editor.component').then(
            (m) => m.AssetContentEditorComponent
          ),
      },
      {
        path: ':slug/review',
        canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_REVIEW_CONTENT] })],
        data: { kind: 'text' },
        loadComponent: () =>
          import('../components/asset-review-page/asset-review-page.component').then(
            (m) => m.AssetReviewPageComponent
          ),
      },
      {
        path: ':slug',
        canActivate: [
          permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_TEXT_ASSET] }),
        ],
        loadComponent: () =>
          import('./components/text-asset-detail/text-asset-detail.component').then(
            (m) => m.TextAssetDetailComponent
          ),
      },
    ],
  },
];
