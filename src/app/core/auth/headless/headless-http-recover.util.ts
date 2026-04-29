import { HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, of, throwError } from 'rxjs';

/**
 * Some django-allauth / proxy setups return HTTP **401** (or **403**) while the JSON body is a
 * normal success envelope (`status: 200`, `data`, …). `HttpClient` still treats that as an error.
 * Recover by emitting the parsed body as success when it looks like a headless **200** payload.
 */
export function recoverHeadlessJsonOkOnHttpError<T>(source: Observable<T>): Observable<T> {
  return source.pipe(
    catchError((err: unknown) => {
      if (!(err instanceof HttpErrorResponse)) {
        return throwError(() => err);
      }
      const body = err.error;
      if (
        (err.status === 401 || err.status === 403) &&
        body &&
        typeof body === 'object' &&
        (body as Record<string, unknown>)['status'] === 200
      ) {
        return of(body as T);
      }
      return throwError(() => err);
    })
  );
}
