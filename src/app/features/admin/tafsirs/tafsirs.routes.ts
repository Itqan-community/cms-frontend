import { Routes } from '@angular/router';
import { TafsirsLayoutComponent } from './tafsirs-layout.component';

export const tafsirRoutes: Routes = [
  {
    path: '',
    component: TafsirsLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/tafsirs-list/tafsirs-list.component').then(
            (m) => m.TafsirsListComponent
          ),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./components/tafsir-form/tafsir-form.component').then(
            (m) => m.TafsirFormComponent
          ),
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./components/tafsir-form/tafsir-form.component').then(
            (m) => m.TafsirFormComponent
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./components/tafsir-detail/tafsir-detail.component').then(
            (m) => m.TafsirDetailComponent
          ),
      },
    ],
  },
];
