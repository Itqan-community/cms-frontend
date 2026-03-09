import { Routes } from '@angular/router';
import { PublishersLayoutComponent } from './publishers-layout.component';

export const publishersRoutes: Routes = [
  {
    path: ':id/details',
    loadComponent: () =>
      import('./components/publisher-details/publisher-details.component').then(
        (m) => m.PublisherDetailsComponent
      ),
  },
  {
    path: '',
    component: PublishersLayoutComponent,
    children: [
      { path: '', redirectTo: 'publishers', pathMatch: 'full' },
      {
        path: 'publishers',
        loadComponent: () =>
          import('../components/publishers-tab/publishers-tab.component').then(
            (m) => m.PublishersTabComponent
          ),
      },
      {
        path: 'authors',
        loadComponent: () =>
          import('../components/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent
          ),
        data: { emoji: '✍️' },
      },
      {
        path: 'sources',
        loadComponent: () =>
          import('../components/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent
          ),
        data: { emoji: '🗂️' },
      },
    ],
  },
];
