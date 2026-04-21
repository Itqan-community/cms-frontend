import { Routes } from '@angular/router';

export const usageRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/usage-page/usage-page.component').then((m) => m.UsagePageComponent),
  },
];
