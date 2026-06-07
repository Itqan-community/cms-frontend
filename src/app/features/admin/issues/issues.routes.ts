import { Routes } from '@angular/router';
// import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
// import { permissionGuard } from '../guards/permission.guard';
import { IssuesLayoutComponent } from './issues-layout.component';

/**
 * Issue reports — route guards commented until backend seeds portal_*_issue_report permissions.
 * TODO(backend-permissions): enable {@link permissionGuard} per child using PORTAL_PERMISSIONS.
 */
export const issueRoutes: Routes = [
  {
    path: '',
    component: IssuesLayoutComponent,
    children: [
      {
        path: '',
        // canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_ISSUE_REPORT] })],
        loadComponent: () =>
          import('./components/issues-list/issues-list.component').then(
            (m) => m.IssuesListComponent
          ),
      },
      {
        path: 'create',
        // canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_CREATE_ISSUE_REPORT] })],
        loadComponent: () =>
          import('./components/issue-form/issue-form.component').then((m) => m.IssueFormComponent),
      },
      {
        path: ':id/edit',
        // canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_UPDATE_ISSUE_REPORT] })],
        loadComponent: () =>
          import('./components/issue-form/issue-form.component').then((m) => m.IssueFormComponent),
      },
      {
        path: ':id',
        // canActivate: [permissionGuard({ permissions: [PORTAL_PERMISSIONS.PORTAL_READ_ISSUE_REPORT] })],
        loadComponent: () =>
          import('./components/issue-detail/issue-detail.component').then(
            (m) => m.IssueDetailComponent
          ),
      },
    ],
  },
];
