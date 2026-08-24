import { environment } from '../../../../../environments/environment';
import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';
import { AdminAuthService } from '../../services/admin-auth.service';

/** Interim: allow program actions during mock API phase or when BE permission is granted. */
export function canCreateProgram(auth: AdminAuthService): boolean {
  return (
    environment.useProgramsMockApi || auth.hasPermission(PORTAL_PERMISSIONS.PORTAL_CREATE_PROGRAM)
  );
}

export function canUpdateProgram(auth: AdminAuthService): boolean {
  return (
    environment.useProgramsMockApi || auth.hasPermission(PORTAL_PERMISSIONS.PORTAL_UPDATE_PROGRAM)
  );
}

export function canDeleteProgram(auth: AdminAuthService): boolean {
  return (
    environment.useProgramsMockApi || auth.hasPermission(PORTAL_PERMISSIONS.PORTAL_DELETE_PROGRAM)
  );
}
