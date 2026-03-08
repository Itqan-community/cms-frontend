import { Routes } from '@angular/router';
import { AudioLayoutComponent } from './audio-layout.component';

export const audioRoutes: Routes = [
  {
    path: '',
    component: AudioLayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'recitations',
        pathMatch: 'full',
      },
      {
        path: 'reciters',
        loadComponent: () =>
          import('./reciters/reciters.page').then(
            (m) => m.RecitersPage
          ),
      },
      {
        path: 'recitations',
        loadComponent: () =>
          import('../components/recitations-stats-cards/recitations-stats-cards.component').then(
            (m) => m.RecitationsStatsCardsComponent
          ),
      },
      {
        path: '**',
        loadComponent: () =>
          import('../components/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent
          ),
      },
    ],
  },
];
