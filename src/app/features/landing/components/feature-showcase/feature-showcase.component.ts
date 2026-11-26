import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { SHOWCASE_FEATURES, SHOWCASE_INTERVAL_MS, SHOWCASE_PAGE_SIZE } from '../../data/features';

/**
 * "Some of what Fanar does": samples from SHOWCASE_FEATURES, 5 at a time. The copy never states how
 * many there are, so features can be added or removed in data/features.ts alone. Rotates every 6 s; pauses while
 * hovered or focused, has a stop/start button, and starts stopped for prefers-reduced-motion.
 */
@Component({
  selector: 'app-feature-showcase',
  standalone: true,
  imports: [TranslatePipe],
  styleUrls: ['./feature-showcase.component.less'],
  templateUrl: './feature-showcase.component.html',
})
export class FeatureShowcaseComponent {
  readonly pageCount = Math.ceil(SHOWCASE_FEATURES.length / SHOWCASE_PAGE_SIZE);
  readonly pages = Array.from({ length: this.pageCount }, (_, i) => i);

  readonly page = signal(0);
  readonly stopped = signal(prefersReducedMotion());
  private readonly held = signal(false);

  readonly items = computed(() =>
    SHOWCASE_FEATURES.slice(
      this.page() * SHOWCASE_PAGE_SIZE,
      this.page() * SHOWCASE_PAGE_SIZE + SHOWCASE_PAGE_SIZE
    )
  );

  constructor() {
    const timer = setInterval(() => {
      if (!this.held() && !this.stopped()) this.go(this.page() + 1);
    }, SHOWCASE_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  go(page: number): void {
    this.page.set((page + this.pageCount) % this.pageCount);
  }

  toggle(): void {
    this.stopped.update((v) => !v);
  }

  hold(held: boolean): void {
    this.held.set(held);
  }

  /** Focus moving between the showcase's own buttons must not resume the rotation. */
  onFocusOut(event: FocusEvent, host: HTMLElement): void {
    if (!host.contains(event.relatedTarget as Node | null)) this.hold(false);
  }
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
