import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, Observable, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Wait until auth is ready for protected-route decisions:
 * provisional (token + cached user) or bootstrap validation finished.
 */
export function waitUntilAuthReady(): Observable<AuthService> {
  const authService = inject(AuthService);
  return toObservable(authService.authReady).pipe(
    filter(Boolean),
    take(1),
    map(() => authService)
  );
}
