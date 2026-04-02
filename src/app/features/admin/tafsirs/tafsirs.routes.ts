import { Routes } from '@angular/router';

export const tafsirRoutes: Routes = [
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
    path: ':id',
    loadComponent: () =>
      import('./components/tafsir-detail/tafsir-detail.component').then(
        (m) => m.TafsirDetailComponent
      ),
  },
  {
    path: ':id/edit',
    loadComponent: () =>
      import('./components/tafsir-form/tafsir-form.component').then(
        (m) => m.TafsirFormComponent
      ),
  },
];
