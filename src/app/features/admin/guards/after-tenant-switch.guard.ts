import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { consumeTenantSwitch } from '../utils/admin-tenant-navigation.util';

/**
 * On `/unauthorized`: when a publisher switch reloaded a page the new publisher's role does not
 * allow, go to the admin home instead, which keeps the publisher picker within reach.
 */
export const afterTenantSwitchGuard: CanActivateFn = () =>
  consumeTenantSwitch() ? inject(Router).createUrlTree(['/admin']) : true;
