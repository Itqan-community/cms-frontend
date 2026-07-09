import { environment } from '../../../../../environments/environment';
import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';
import { AdminAuthService } from '../../services/admin-auth.service';

/** Interim: allow mushaf actions during mock API phase or when BE permission is granted. */
export function canCreateMushaf(auth: AdminAuthService): boolean {
  return (
    environment.useMushafsMockApi || auth.hasPermission(PORTAL_PERMISSIONS.PORTAL_CREATE_MUSHAF)
  );
}

export function canUpdateMushaf(auth: AdminAuthService): boolean {
  return (
    environment.useMushafsMockApi || auth.hasPermission(PORTAL_PERMISSIONS.PORTAL_UPDATE_MUSHAF)
  );
}

export function canDeleteMushaf(auth: AdminAuthService): boolean {
  return (
    environment.useMushafsMockApi || auth.hasPermission(PORTAL_PERMISSIONS.PORTAL_DELETE_MUSHAF)
  );
}
