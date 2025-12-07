import { computed, Injectable, OnDestroy, signal } from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { BREAKPOINTS } from '../constants/breakpoints';

@Injectable({
  providedIn: 'root',
})
export class ViewportService implements OnDestroy {
  private subscription: Subscription = new Subscription();

  // Signal for raw window width
  readonly width = signal<number>(typeof window !== 'undefined' ? window.innerWidth : 0);

  // Computed signals for specific breakpoints
  readonly isMobile = computed(() => this.width() <= BREAKPOINTS.md);
  readonly isTablet = computed(
    () => this.width() > BREAKPOINTS.md && this.width() <= BREAKPOINTS.lg
  );
  readonly isDesktop = computed(() => this.width() > BREAKPOINTS.lg);

  constructor() {
    if (typeof window !== 'undefined') {
      this.initResizeListener();
    }
  }

  private initResizeListener() {
    const resize$ = fromEvent(window, 'resize').pipe(
      debounceTime(200),
      map(() => window.innerWidth),
      distinctUntilChanged(),
      startWith(window.innerWidth)
    );

    this.subscription.add(
      resize$.subscribe((w) => {
        this.width.set(w);
      })
    );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
}
