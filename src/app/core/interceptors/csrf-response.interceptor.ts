import {
  HttpEvent,
  HttpEventType,
  HttpHandlerFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { setCrossOriginDjangoCsrfToken } from '../utils/csrf.util';

/** If BE mirrors the token here, CORS must list it in Access-Control-Expose-Headers. */
const CSRF_RESPONSE_HEADER_NAMES = ['X-CSRFToken', 'X-CSRF-Token', 'Csrf-Token'];

/**
 * Cross-origin pages cannot read the API host's `csrftoken` cookie via `document.cookie`.
 * If the API returns the same value in an exposed response header, we store it for POSTs.
 */
export function csrfResponseInterceptor(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> {
  const base = environment.API_BASE_URL;
  if (!base || !req.url.startsWith(base)) {
    return next(req);
  }
  return next(req).pipe(
    tap((event) => {
      if (event.type !== HttpEventType.Response) {
        return;
      }
      const res = event as HttpResponse<unknown>;
      for (const name of CSRF_RESPONSE_HEADER_NAMES) {
        const v = res.headers.get(name);
        if (v) {
          setCrossOriginDjangoCsrfToken(v);
          break;
        }
      }
    })
  );
}
