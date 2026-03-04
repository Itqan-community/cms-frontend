import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { catchError, Observable, throwError } from 'rxjs';

/**
 * Global Error Interceptor
 * Catches all HTTP errors and displays a message to the user using NzMessageService.
 */
export function errorInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const message = inject(NzMessageService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Ignore auth errors as they are handled by authErrorInterceptor
      if (error.status === 401 || error.status === 403) {
        return throwError(() => error);
      }

      let errorMessage = '';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = error.error.message;
      } else {
        // Server-side error
        // Try to get message from API response if it exists
        errorMessage = error.error?.message || error.message || 'Server Error';
      }

      // Show the error message using Ng-Zorro Message service
      message.error(errorMessage);

      return throwError(() => error);
    })
  );
}
