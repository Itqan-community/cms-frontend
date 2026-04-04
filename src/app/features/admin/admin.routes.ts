import { Routes } from '@angular/router';

export const adminRoutes: Routes = [
  { path: '', redirectTo: 'search', pathMatch: 'full' },
  {
    path: 'search',
    loadComponent: () =>
      import('./components/search-panel/search-panel.component').then(
        (m) => m.SearchPanelComponent
      ),
  },
  {
    path: 'mushafs',
    loadChildren: () => import('./mushafs/mushafs.routes').then((m) => m.mushafsRoutes),
  },
  {
    path: 'fonts',
    loadComponent: () =>
      import('./components/coming-soon/coming-soon.component').then((m) => m.ComingSoonComponent),
    data: { emoji: '✏️' },
  },
  {
    path: 'translations',
    loadComponent: () =>
      import('./components/coming-soon/coming-soon.component').then((m) => m.ComingSoonComponent),
    data: { emoji: '🌍' },
  },
  {
    path: 'linguistics',
    loadComponent: () =>
      import('./components/coming-soon/coming-soon.component').then((m) => m.ComingSoonComponent),
    data: { emoji: '🌐' },
  },
  {
    path: 'tajweed',
    loadComponent: () =>
      import('./components/coming-soon/coming-soon.component').then((m) => m.ComingSoonComponent),
    data: { emoji: '🎓' },
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
    data: { emoji: '📋' },
  },
];
