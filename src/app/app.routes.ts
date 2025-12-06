import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'gallery',
    pathMatch: 'full',
  },
  {
    path: 'gallery',
    loadChildren: () => import('./features/gallery/routes').then((m) => m.GALLERY_ROUTES),
  },
  {
    path: 'publishers',
    loadChildren: () => import('./features/publishers/routes').then((m) => m.PUBLISHERS_ROUTES),
  },
  {
    path: 'login',
    loadComponent: () => import('./core/auth/pages/login/login.page').then((m) => m.LoginPage),
    data: { hideHeader: true },
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./core/auth/pages/register/register.page').then((m) => m.RegisterPage),
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
    data: { hideHeader: true },
  },
  {
    path: 'content-standards',
    loadChildren: () =>
      import('./features/content-standards/routes').then((m) => m.CONTENT_STANDARDS_ROUTES),
  },
  {
    path: 'publisher/:id',
    loadComponent: () =>
      import('./features/publishers/pages/publisher-details/publisher-details.page').then(
        (m) => m.PublisherDetailsPage
      ),
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
