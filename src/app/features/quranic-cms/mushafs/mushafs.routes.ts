import { Routes } from '@angular/router';
import { MushafsLayoutComponent } from './mushafs-layout.component';

export const mushafsRoutes: Routes = [
  {
    path: '',
    component: MushafsLayoutComponent,
    children: [
      { path: '', redirectTo: 'pages', pathMatch: 'full' },
      {
        path: 'pages',
        loadComponent: () => import('./pages/mushaf-pages.page').then((m) => m.MushafPagesPage),
      },
      {
        path: 'words',
        loadComponent: () => import('./words/mushaf-words.page').then((m) => m.MushafWordsPage),
        data: { emoji: '📝' },
      },
      {
        path: 'ayahs',
        loadComponent: () => import('./ayahs/ayahs.page').then((m) => m.AyahsPage),
      },
      {
        path: 'surahs',
        loadComponent: () => import('./surahs/surahs').then((m) => m.Surahs),
        data: { emoji: '📚' },
      },
    ],
  },
];
