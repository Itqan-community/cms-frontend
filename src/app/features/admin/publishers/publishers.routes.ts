import { Routes } from '@angular/router';
import { PublishersLayoutComponent } from './publishers-layout.component';

export const publishersRoutes: Routes = [
  {
    path: '',
    component: PublishersLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/publishers-index-redirect/publishers-index-redirect.component').then(
            (m) => m.PublishersIndexRedirectComponent
          ),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./components/publisher-form/publisher-form.component').then(
            (m) => m.PublisherFormComponent
          ),
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./components/publisher-form/publisher-form.component').then(
            (m) => m.PublisherFormComponent
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./components/publisher-detail/publisher-detail.component').then(
            (m) => m.PublisherDetailComponent
          ),
      },
    ],
  },
];
