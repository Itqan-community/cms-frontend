import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, Injector, signal } from '@angular/core';
import { catchError, finalize, map, Observable, of, shareReplay } from 'rxjs';
import { AuthService } from '../../../core/auth/services/auth.service';
import { environment } from '../../../../environments/environment';

export interface MyPublisherOut {
  id: number;
  name: string;
  slug: string;
  icon_url: string | null;
  /** The caller's effective permissions at this publisher (roles are per publisher). */
  permissions: string[];
}

export const ADMIN_TENANT_STORAGE_KEY = 'admin:selectedPublisherId';

function parseTenantId(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
}

export function getStoredAdminTenantId(): number | null {
  try {
    return parseTenantId(localStorage.getItem(ADMIN_TENANT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function storeAdminTenantId(value: number | null): void {
  try {
    if (value == null) {
      localStorage.removeItem(ADMIN_TENANT_STORAGE_KEY);
      return;
    }
    localStorage.setItem(ADMIN_TENANT_STORAGE_KEY, String(value));
  } catch {
    // ignore storage errors
  }
}

@Injectable({ providedIn: 'root' })
export class AdminTenantService {
  private readonly http = inject(HttpClient);
  private readonly injector = inject(Injector);
  private readonly apiUrl = `${environment.ADMIN_API_BASE_URL}/publishers/me/`;
  private loadOnce$?: Observable<boolean>;

  /** The loaded list and whose it is: sign-out and sign-in do not reload the page. */
  private readonly loaded = signal<{ userId: string | null; publishers: MyPublisherOut[] }>({
    userId: null,
    publishers: [],
  });
  // Looked up lazily: AuthService pulls in the whole auth stack, which most callers never need.
  private readonly currentUserId = computed(
    () => this.injector.get(AuthService).currentUser()?.id ?? null
  );

  /** The signed-in user's publishers; empty until loaded for that user. */
  readonly publishers = computed(() => {
    const { userId, publishers } = this.loaded();
    return userId === this.currentUserId() ? publishers : [];
  });
  readonly selectedPublisherId = signal<number | null>(getStoredAdminTenantId());
  readonly isLoading = signal(false);
  readonly hasValidSelection = computed(
    () =>
      this.selectedPublisherId() != null &&
      this.publishers().some((publisher) => publisher.id === this.selectedPublisherId())
  );
  readonly isReady = computed(() => this.publishers().length > 0 && this.hasValidSelection());

  ensureReady(): Observable<boolean> {
    if (this.isReady()) {
      storeAdminTenantId(this.selectedPublisherId());
      return of(true);
    }
    if (this.loadOnce$) {
      return this.loadOnce$;
    }

    this.isLoading.set(true);
    const userId = this.currentUserId();
    const request$ = this.http.get<MyPublisherOut[]>(this.apiUrl).pipe(
      map((publishers) => this.hydratePublishers(userId, publishers)),
      catchError(() => {
        this.loaded.set({ userId, publishers: [] });
        this.selectedPublisherId.set(null);
        storeAdminTenantId(null);
        return of(false);
      }),
      finalize(() => {
        this.isLoading.set(false);
        this.loadOnce$ = undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.loadOnce$ = request$;
    return request$;
  }

  setSelectedPublisherId(publisherId: number): boolean {
    if (!this.publishers().some((publisher) => publisher.id === publisherId)) {
      return false;
    }
    this.selectedPublisherId.set(publisherId);
    storeAdminTenantId(publisherId);
    return true;
  }

  getSelectedPublisherId(): number | null {
    return this.selectedPublisherId();
  }

  private hydratePublishers(userId: string | null, publishers: MyPublisherOut[]): boolean {
    this.loaded.set({ userId, publishers });
    if (!publishers.length) {
      this.selectedPublisherId.set(null);
      storeAdminTenantId(null);
      return false;
    }

    const current = this.selectedPublisherId();
    if (current != null && publishers.some((publisher) => publisher.id === current)) {
      storeAdminTenantId(current);
      return true;
    }

    const stored = getStoredAdminTenantId();
    if (stored != null && publishers.some((publisher) => publisher.id === stored)) {
      this.selectedPublisherId.set(stored);
      storeAdminTenantId(stored);
      return true;
    }

    const fallback = publishers[0].id;
    this.selectedPublisherId.set(fallback);
    storeAdminTenantId(fallback);
    return true;
  }
}
