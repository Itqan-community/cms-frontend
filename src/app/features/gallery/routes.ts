import { Routes } from '@angular/router';

export const GALLERY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/gallery/gallery.page').then((m) => m.GalleryPage),
  },
  {
    path: 'asset/:id',
    loadComponent: () =>
      import('./pages/asset-details/asset-details.page').then((m) => m.AssetDetailsPage),
  },
];
