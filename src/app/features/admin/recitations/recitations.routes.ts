import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/recitation-list/recitation-list.component').then(
        (m) => m.RecitationListComponent
      ),
  },
];
