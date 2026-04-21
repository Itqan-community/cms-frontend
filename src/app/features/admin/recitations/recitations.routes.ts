import { Routes } from '@angular/router';
import { RecitationsLayoutComponent } from './recitations-layout.component';
import { recitationDetailCanDeactivate } from './components/recitation-detail/recitation-detail.can-deactivate';

export const recitationRoutes: Routes = [
  {
    path: '',
    component: RecitationsLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/recitations-list/recitations-list.component').then(
            (m) => m.RecitationsListComponent
          ),
      },
      {
        path: 'create',
        loadComponent: () =>
          import('./components/recitation-form/recitation-form.component').then(
            (m) => m.RecitationFormComponent
          ),
      },
      {
        path: ':slug/edit',
        loadComponent: () =>
          import('./components/recitation-form/recitation-form.component').then(
            (m) => m.RecitationFormComponent
          ),
      },
      {
        path: ':slug',
        canDeactivate: [recitationDetailCanDeactivate],
        loadComponent: () =>
          import('./components/recitation-detail/recitation-detail.component').then(
            (m) => m.RecitationDetailComponent
          ),
      },
    ],
  },
];
