import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/guards/auth.guard';
import { publisherHostGuard } from '../../core/guards/publisher-host.guard';

export const mushafRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard, publisherHostGuard],
    loadComponent: () =>
      import('./pages/surah-index/surah-index.page').then((m) => m.SurahIndexPage),
  },
  {
    path: ':surahId',
    canActivate: [authGuard, publisherHostGuard],
    loadComponent: () => import('./pages/surah-view/surah-view.page').then((m) => m.SurahViewPage),
  },
  {
    path: ':surahId/:ayahNumber',
    canActivate: [authGuard, publisherHostGuard],
    loadComponent: () => import('./pages/ayah-focus/ayah-focus.page').then((m) => m.AyahFocusPage),
  },
];
