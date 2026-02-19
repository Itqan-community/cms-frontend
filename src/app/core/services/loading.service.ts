import { Injectable, signal, computed } from '@angular/core';

/**
 * Global loading service — tracks pending HTTP requests and manual loading states.
 * Use `show()` / `hide()` for manual control, or let the HTTP interceptor handle it automatically.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private _pendingRequests = signal(0);

  /** True whenever there is at least one pending request or manual show() call active */
  readonly isLoading = computed(() => this._pendingRequests() > 0);

  show(): void {
    this._pendingRequests.update((n) => n + 1);
  }

  hide(): void {
    this._pendingRequests.update((n) => Math.max(0, n - 1));
  }
}
