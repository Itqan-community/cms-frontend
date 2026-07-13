import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';
import { AdminAuthService } from '../../services/admin-auth.service';

export function canCreateFont(auth: AdminAuthService): boolean {
  return auth.hasPermission(PORTAL_PERMISSIONS.PORTAL_CREATE_FONT);
}

export function canUpdateFont(auth: AdminAuthService): boolean {
  return auth.hasPermission(PORTAL_PERMISSIONS.PORTAL_UPDATE_FONT);
}

export function canDeleteFont(auth: AdminAuthService): boolean {
  return auth.hasPermission(PORTAL_PERMISSIONS.PORTAL_DELETE_FONT);
}
