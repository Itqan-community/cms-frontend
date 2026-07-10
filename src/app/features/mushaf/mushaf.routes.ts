import { Routes } from '@angular/router';
import { authGuard } from '../../core/auth/guards/auth.guard';

export const mushafRoutes: Routes = [
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/sura-index/sura-index.page').then((m) => m.SuraIndexPage),
  },
  {
    path: ':suraId',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/sura-view/sura-view.page').then((m) => m.SuraViewPage),
  },
  {
    path: ':suraId/:ayahNumber',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/ayah-focus/ayah-focus.page').then((m) => m.AyahFocusPage),
  },
];
