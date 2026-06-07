import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Angular analogue of `document.dispatchEvent(new CustomEvent('allauth.auth.change', { detail }))`.
 */
@Injectable({ providedIn: 'root' })
export class AllauthAuthChangeBus {
  private readonly subject = new Subject<unknown>();

  /** Stream of envelope payloads that triggered an auth refresh (same criteria as official SPA). */
  readonly changes$ = this.subject.asObservable();

  emit(detail: unknown): void {
    this.subject.next(detail);
  }
}
