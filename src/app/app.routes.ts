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
    path: 'publishers',
    loadComponent: () =>
      import('./features/publishers/pages/publishers/publishers.page').then(
        (m) => m.PublishersPage
      ),
    canActivate: [publisherHostGuard], // Restrict access for publisher hosts
  },
  {
    path: 'publisher/:id',
    loadComponent: () =>
      import('./features/publishers/pages/publisher-details/publisher-details.page').then(
        (m) => m.PublisherDetailsPage
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
