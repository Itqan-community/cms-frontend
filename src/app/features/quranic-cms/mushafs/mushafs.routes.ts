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
        loadComponent: () =>
          import('./pages/mushaf-pages.page').then((m) => m.MushafPagesPage),
      },
      {
        path: 'words',
        loadComponent: () =>
          import('../components/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent
          ),
        data: { emoji: '📝' },
      },
      {
        path: 'ayahs',
        loadComponent: () =>
          import('../components/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent
          ),
        data: { emoji: '📖' },
      },
      {
        path: 'surahs',
        loadComponent: () =>
          import('../components/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent
          ),
        data: { emoji: '📚' },
      },
    ],
  },
];
