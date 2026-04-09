import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  { path: 'search', redirectTo: 'publishers', pathMatch: 'full' },
  { path: 'mushafs', redirectTo: 'publishers', pathMatch: 'prefix' },
  {
    path: 'fonts',
    loadComponent: () =>
      import('./components/coming-soon/coming-soon.component').then((m) => m.ComingSoonComponent),
    data: { icon: 'lucidePalette' },
  },
  {
    path: 'linguistics',
    loadComponent: () =>
      import('./components/coming-soon/coming-soon.component').then((m) => m.ComingSoonComponent),
    data: { icon: 'lucideLanguages' },
  },
  {
    path: 'tajweed',
    loadComponent: () =>
      import('./components/coming-soon/coming-soon.component').then((m) => m.ComingSoonComponent),
    data: { icon: 'lucideSparkles' },
  },
  {
    path: 'audio',
    loadChildren: () => import('./audio/audio.routes').then((m) => m.audioRoutes),
  },
  {
    path: 'software',
    loadChildren: () => import('./software/software.routes').then((m) => m.softwareRoutes),
  },
  {
    path: '**',
    loadComponent: () =>
      import('./components/coming-soon/coming-soon.component').then((m) => m.ComingSoonComponent),
    data: { icon: 'lucideClock' },
  },
];
