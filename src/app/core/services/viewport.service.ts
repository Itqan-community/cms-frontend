import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  computed,
  inject,
  Injectable,
  OnDestroy,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { fromEvent, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { BREAKPOINTS } from '../constants/breakpoints';

/**
 * The width the server renders for (it can't know the screen). A server-rendered page keeps it
 * until hydration ends, so the browser's first render matches the server's DOM; then the real
 * width applies.
 */
const SERVER_RENDER_WIDTH = BREAKPOINTS.xl;

@Injectable({
  providedIn: 'root',
})
export class ViewportService implements OnDestroy {
  private subscription: Subscription = new Subscription();

  // Signal for raw window width
  readonly width = signal<number>(SERVER_RENDER_WIDTH);

  // Computed signals for specific breakpoints
  readonly isMobile = computed(() => this.width() <= BREAKPOINTS.md);
  readonly isTablet = computed(
    () => this.width() > BREAKPOINTS.md && this.width() <= BREAKPOINTS.lg
  );
  readonly isDesktop = computed(() => this.width() > BREAKPOINTS.lg);

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) {
      return;
    }
    if (inject(DOCUMENT).querySelector('[ng-server-context]')) {
      afterNextRender(() => this.initResizeListener());
    } else {
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
