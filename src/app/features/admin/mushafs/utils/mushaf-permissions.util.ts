import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';
import { AdminAuthService } from '../../services/admin-auth.service';

export function canCreateMushaf(auth: AdminAuthService): boolean {
  return auth.hasPermission(PORTAL_PERMISSIONS.PORTAL_CREATE_MUSHAF);
}

export function canUpdateMushaf(auth: AdminAuthService): boolean {
  return auth.hasPermission(PORTAL_PERMISSIONS.PORTAL_UPDATE_MUSHAF);
}

export function canDeleteMushaf(auth: AdminAuthService): boolean {
  return auth.hasPermission(PORTAL_PERMISSIONS.PORTAL_DELETE_MUSHAF);
}
