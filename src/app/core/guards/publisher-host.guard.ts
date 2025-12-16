import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPublisherHost } from '../../shared/utils/publisherhost.util';

/**
 * Guard to prevent publisher hosts from accessing certain routes
 * Redirects publisher hosts to the gallery page
 */
export const publisherHostGuard: CanActivateFn = () => {
  const router = inject(Router);

  if (isPublisherHost()) {
    router.navigate(['/gallery']);
    return false;
  }

  return true;
};
