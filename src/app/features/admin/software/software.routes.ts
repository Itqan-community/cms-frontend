import { Routes } from '@angular/router';
import { SoftwareLayoutComponent } from './software-layout.component';

export const softwareRoutes: Routes = [
  {
    path: '',
    component: SoftwareLayoutComponent,
    children: [
      { path: '', redirectTo: 'resources', pathMatch: 'full' },
      {
        path: 'resources',
        loadComponent: () =>
          import('../components/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent
          ),
        data: { icon: 'lucideWrench' },
      },
      {
        path: 'backend',
        loadComponent: () =>
          import('../components/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent
          ),
        data: { icon: 'lucideSettings' },
      },
      {
        path: 'import',
        loadComponent: () =>
          import('../components/coming-soon/coming-soon.component').then(
            (m) => m.ComingSoonComponent
          ),
        data: { icon: 'lucideDownloadCloud' },
      },
    ],
  },
];
