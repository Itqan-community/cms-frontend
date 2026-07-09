import { environment } from '../../../../../environments/environment';
import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';
import { AdminAuthService } from '../../services/admin-auth.service';

/** Interim: allow font actions during mock API phase or when BE permission is granted. */
export function canCreateFont(auth: AdminAuthService): boolean {
  return environment.useFontsMockApi || auth.hasPermission(PORTAL_PERMISSIONS.PORTAL_CREATE_FONT);
}

export function canUpdateFont(auth: AdminAuthService): boolean {
  return environment.useFontsMockApi || auth.hasPermission(PORTAL_PERMISSIONS.PORTAL_UPDATE_FONT);
}

export function canDeleteFont(auth: AdminAuthService): boolean {
  return environment.useFontsMockApi || auth.hasPermission(PORTAL_PERMISSIONS.PORTAL_DELETE_FONT);
}
