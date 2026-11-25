import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpContextToken,
  HttpRequest,
} from '@angular/common/http';
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

/**
 * Set on a portal-API request made outside the portal (the gallery's issue report), so it goes
 * without X-Tenant: a consumer, or staff, can then report any publisher's asset. The portal's own
 * issue form leaves it unset, so the backend limits it to the selected publisher's assets.
 */
export const SKIP_TENANT_HEADER = new HttpContextToken<boolean>(() => false);

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

  if (req.context.get(SKIP_TENANT_HEADER)) {
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
          statusText: 'Forbidden',
          url: req.url,
          error: {
            error_name: 'tenant_required',
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
