import { Routes } from '@angular/router';
import { RecitersLayoutComponent } from './reciters-layout.component';

export const reciterRoutes: Routes = [
  {
    path: '',
    component: RecitersLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/reciters-list/reciters-list.component').then(
            (m) => m.RecitersListComponent
          ),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./components/reciter-form/reciter-form.component').then(
            (m) => m.ReciterFormComponent
          ),
      },
      {
        path: ':slug/edit',
        loadComponent: () =>
          import('./components/reciter-form/reciter-form.component').then(
            (m) => m.ReciterFormComponent
          ),
      },
      {
        path: ':slug',
        loadComponent: () =>
          import('./components/reciter-detail/reciter-detail.component').then(
            (m) => m.ReciterDetailComponent
          ),
      },
    ],
  },
];
