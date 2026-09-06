import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/guards/auth.guard';
import { publisherHostGuard } from '../../core/guards/publisher-host.guard';

export const mushafRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard, publisherHostGuard],
    loadComponent: () => import('./pages/sura-index/sura-index.page').then((m) => m.SuraIndexPage),
  },
  {
    path: ':suraId',
    canActivate: [authGuard, publisherHostGuard],
    loadComponent: () => import('./pages/sura-view/sura-view.page').then((m) => m.SuraViewPage),
  },
  {
    path: ':suraId/:ayahNumber',
    canActivate: [authGuard, publisherHostGuard],
    loadComponent: () => import('./pages/ayah-focus/ayah-focus.page').then((m) => m.AyahFocusPage),
  },
];
