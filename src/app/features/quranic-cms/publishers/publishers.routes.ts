import { Routes } from '@angular/router';
import { PublishersLayoutComponent } from './publishers-layout.component';
import { PublishersComponent } from './publishers.component';

export const publishersRoutes: Routes = [
  {
    path: '',
    component: PublishersLayoutComponent,
    children: [
      {
        path: '',
        component: PublishersComponent,
      },
      {
        path: ':id/details',
        loadComponent: () =>
          import('./components/publisher-details/publisher-details.component').then(
            (m) => m.PublisherDetailsComponent
          ),
      },
      {
        path: 'authors',
        loadComponent: () =>
          import('../../../shared/components/empty-placeholder/empty-placeholder.component').then(
            (m) => m.EmptyPlaceholderComponent
          ),
        data: { title: 'المؤلفون' },
      },
      {
        path: 'sources',
        loadComponent: () =>
          import('../../../shared/components/empty-placeholder/empty-placeholder.component').then(
            (m) => m.EmptyPlaceholderComponent
          ),
        data: { title: 'المصادر' },
      },
    ],
  },
];
