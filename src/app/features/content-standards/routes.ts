import { Routes } from '@angular/router';

export const CONTENT_STANDARDS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./content-standards.page').then((m) => m.UsageStandardsPage),
  },
];
