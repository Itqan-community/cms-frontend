import { Routes } from '@angular/router';
import { accountAuthRoutes } from './core/auth/account.routes';
import { authGuard } from './core/auth/guards/auth.guard';
import { publisherHostGuard } from './core/guards/publisher-host.guard';
import { portalAccessGuard } from './features/admin/guards/portal-access.guard';
import { itqanAdminGuard } from './features/admin/guards/itqan-admin.guard';
import { tenantReadyGuard } from './features/admin/guards/tenant-ready.guard';

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
    canActivate: [authGuard, portalAccessGuard, tenantReadyGuard],
    data: { hideHeader: true, fullWidth: true },
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/admin/admin-portal-redirect.component').then(
            (m) => m.AdminPortalRedirectComponent
          ),
      },
      {
        path: 'publishers',
        canActivate: [itqanAdminGuard],
        loadChildren: () =>
          import('./features/admin/publishers/publishers.routes').then((m) => m.publishersRoutes),
      },
      {
        path: 'profile',
        redirectTo: '',
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
        path: 'issues',
        loadChildren: () =>
          import('./features/admin/issues/issues.routes').then((m) => m.issueRoutes),
      },
      {
        path: 'members',
        loadChildren: () =>
          import('./features/admin/members/members.routes').then((m) => m.membersRoutes),
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

  ...accountAuthRoutes,

  /** `HEADLESS_FRONTEND_URLS.account_confirm_email` (django-allauth) */
  {
    path: 'accounts',
    children: [
      {
        path: 'confirm-email/:key',
        loadComponent: () =>
          import('./core/auth/pages/verify-email/verify-email.page').then((m) => m.VerifyEmailPage),
        data: { hideHeader: true, beHeadlessPath: 'account_confirm_email' },
      },
      {
        path: 'confirm-email/:key/',
        pathMatch: 'full',
        loadComponent: () =>
          import('./core/auth/pages/verify-email/verify-email.page').then((m) => m.VerifyEmailPage),
        data: { hideHeader: true, beHeadlessPath: 'account_confirm_email' },
      },
    ],
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
