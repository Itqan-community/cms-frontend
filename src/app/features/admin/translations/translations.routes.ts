import { Routes } from '@angular/router';
import { TranslationsLayoutComponent } from './translations-layout.component';

export const translationRoutes: Routes = [
  {
    path: '',
    component: TranslationsLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/translations-list/translations-list.component').then(
            (m) => m.TranslationsListComponent
          ),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./components/translation-form/translation-form.component').then(
            (m) => m.TranslationFormComponent
          ),
      },
      {
        path: ':id/edit',
        loadComponent: () =>
          import('./components/translation-form/translation-form.component').then(
            (m) => m.TranslationFormComponent
          ),
      },
      {
        path: ':id',
        loadComponent: () =>
          import('./components/translation-detail/translation-detail.component').then(
            (m) => m.TranslationDetailComponent
          ),
      },
    ],
  },
];
