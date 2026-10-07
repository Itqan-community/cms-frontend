import { Routes } from '@angular/router';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { permissionGuard } from '../guards/permission.guard';
import { timestampEditorCanDeactivate } from './components/timestamp-editor/timestamp-editor.can-deactivate';

export const audioRoutes: Routes = [
  {
    /**
     * Ayah timestamp editor. `recitation` is required as a query param — the track lookup goes
     * through the recitation-scoped tracks endpoint, so the slug travels with the link.
     */
    path: 'timestamps/:trackId',
    canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_UPLOAD_TIMING] })],
    canDeactivate: [timestampEditorCanDeactivate],
    loadComponent: () =>
      import('./components/timestamp-editor/timestamp-editor.component').then(
        (m) => m.TimestampEditorComponent
      ),
  },
  {
    /** Legacy `/admin/audio` path — recitations and reciters live under their own top-level admin routes now. */
    path: '',
    loadComponent: () =>
      import('../components/coming-soon/coming-soon.component').then((m) => m.ComingSoonComponent),
    data: { icon: 'lucideVolume2' },
  },
];
