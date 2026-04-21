import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';
import { guestGuard } from './core/auth/guards/guest.guard';
import { publisherHostGuard } from './core/guards/publisher-host.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'gallery',
    pathMatch: 'full',
  },
  {
    path: 'gallery',
    loadComponent: () =>
      import('./features/gallery/pages/gallery/gallery.page').then((m) => m.GalleryPage),
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin-layout.component').then((m) => m.AdminLayoutComponent),
    // canActivate: [authGuard, adminGuard],
    data: { hideHeader: true, fullWidth: true },
    children: [
      // Resolve /admin before the lazy '' adminRoutes (avoids ** catch-all flashing Coming Soon on redirect)
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'publishers',
      },
      {
        path: 'publishers',
        // canActivate: [itqanAdminGuard],
        loadChildren: () =>
          import('./features/admin/publishers/publishers.routes').then((m) => m.publishersRoutes),
      },
      {
        path: 'profile',
        redirectTo: 'publishers',
        pathMatch: 'full',
      },
      {
        path: 'tafsirs',
        loadChildren: () =>
          import('./features/admin/tafsirs/tafsirs.routes').then((m) => m.tafsirRoutes),
      },
      {
        path: 'translations',
        loadChildren: () =>
          import('./features/admin/translations/translations.routes').then(
            (m) => m.translationRoutes
          ),
      },
      {
        path: 'recitations',
        loadChildren: () =>
          import('./features/admin/recitations/recitations.routes').then((m) => m.recitationRoutes),
      },
      {
        path: 'reciters',
        loadChildren: () =>
          import('./features/admin/reciters/reciters.routes').then((m) => m.reciterRoutes),
      },
      {
        path: 'usage',
        loadChildren: () =>
          import('./features/admin/usage/usage.routes').then((m) => m.usageRoutes),
      },
      {
        path: '',
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.adminRoutes),
      },
    ],
  },

  {
    path: 'gallery/asset/:id',
    loadComponent: () =>
      import('./features/gallery/pages/asset-details/asset-details.page').then(
        (m) => m.AssetDetailsPage
      ),
  },

  {
    path: 'login',
    loadComponent: () => import('./core/auth/pages/login/login.page').then((m) => m.LoginPage),
    canActivate: [guestGuard],
    data: { hideHeader: true },
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./core/auth/pages/register/register.page').then((m) => m.RegisterPage),
    canActivate: [guestGuard],
    data: { hideHeader: true },
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./features/error/pages/unautorized/unauthorized.page').then(
        (m) => m.UnauthorizedPage
      ),
    data: { hideHeader: true },
  },
  {
    path: 'complete-profile',
    loadComponent: () =>
      import('./core/auth/pages/complete-profile/complete-profile.page').then(
        (m) => m.CompleteProfilePage
      ),
    canActivate: [authGuard],
    data: { hideHeader: true },
  },
  {
    path: 'content-standards',
    loadComponent: () =>
      import('./features/content-standards/content-standards.page').then(
        (m) => m.UsageStandardsPage
      ),
    canActivate: [publisherHostGuard], // Restrict access for publisher hosts
  },
  {
    path: 'license/:id',
    loadComponent: () =>
      import('./features/license/pages/license-details/license-details.page').then(
        (m) => m.LicenseDetailsPage
      ),
  },

  { path: '**', redirectTo: 'gallery' },
];
