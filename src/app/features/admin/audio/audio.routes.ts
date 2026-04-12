import { Routes } from '@angular/router';

/** Legacy `/admin/audio` path — recitations and reciters live under their own top-level admin routes now. */
export const audioRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../components/coming-soon/coming-soon.component').then((m) => m.ComingSoonComponent),
    data: { icon: 'lucideVolume2' },
  },
];
