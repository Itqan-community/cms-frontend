import { Routes } from '@angular/router';

export const PUBLISHERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/publishers/publishers.page').then((m) => m.PublishersPage),
  },
  {
    path: 'publisher/:id',
    loadComponent: () =>
      import('./pages/publisher-details/publisher-details.page').then(
        (m) => m.PublisherDetailsPage
      ),
  },
];
