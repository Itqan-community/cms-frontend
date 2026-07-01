import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AdminTenantService,
  getStoredAdminTenantId,
} from '../../features/admin/services/admin-tenant.service';

function isPortalRequest(url: string, adminApi: string | undefined): boolean {
  return typeof adminApi === 'string' && adminApi.length > 0 && url.startsWith(adminApi);
}

function isPublishersMeRequest(url: string, adminApi: string): boolean {
  return url.startsWith(`${adminApi}/publishers/me`);
}

function isInvitationRequest(url: string, adminApi: string): boolean {
  return url.startsWith(`${adminApi}/invitations/`);
}

/** Consumer issue reports from gallery — no admin tenant context. */
function isConsumerIssueReportCreate(url: string, method: string, adminApi: string): boolean {
  if (method !== 'POST') {
    return false;
  }
  const base = `${adminApi}/issue-reports`;
  return url === base || url === `${base}/`;
}

export function tenantHeaderInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const adminApi = environment.ADMIN_API_BASE_URL;
  if (!isPortalRequest(req.url, adminApi)) {
    return next(req);
  }

  if (isPublishersMeRequest(req.url, adminApi)) {
    return next(req);
  }

  if (isInvitationRequest(req.url, adminApi)) {
    return next(req);
  }

  if (isConsumerIssueReportCreate(req.url, req.method, adminApi)) {
    return next(req);
  }

  const tenantService = inject(AdminTenantService);
  const tenantId = tenantService.getSelectedPublisherId() ?? getStoredAdminTenantId();
  if (tenantId == null) {
    const router = inject(Router);
    void router.navigate(['/unauthorized']);
    return throwError(
      () =>
        new HttpErrorResponse({
          status: 403,
          statusText: 'Missing tenant selection',
          url: req.url,
          error: {
            error_name: 'tenant_required',
            message: 'No selected publisher tenant was found for this request',
            extra: null,
          },
        })
    );
  }

  return next(
    req.clone({
      setHeaders: {
        'X-Tenant': String(tenantId),
      },
    })
  );
}
