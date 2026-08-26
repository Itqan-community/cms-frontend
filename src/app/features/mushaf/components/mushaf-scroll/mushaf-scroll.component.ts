import {
  AfterViewInit,
  Component,
  ElementRef,
  Injector,
  OnDestroy,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { AyahRef, MushafPageComponent } from '../mushaf-page/mushaf-page.component';

/**
 * Infinite-scrolls a surah as a vertical stack of mushaf pages. Starts at
 * `initialPage` (defaulting to the surah's first page) and lazily prepends /
 * appends pages as top/bottom sentinels enter the viewport.
 */
@Component({
  selector: 'app-mushaf-scroll',
  standalone: true,
  imports: [MushafPageComponent],
  templateUrl: './mushaf-scroll.component.html',
  styleUrl: './mushaf-scroll.component.less',
})
export class MushafScrollComponent implements AfterViewInit, OnDestroy {
  private readonly injector = inject(Injector);

  slug = input.required<string>();
  startPage = input.required<number>();
  endPage = input.required<number>();
  /** First page to render (e.g. the page of a targeted ayah). Defaults to startPage. */
  initialPage = input<number | null>(null);
  /** Ayah to highlight + scroll into view once its page is rendered. */
  highlightAyah = input<AyahRef | null>(null);

  ayahClick = output<AyahRef>();

  /** Pages currently rendered (contiguous, ascending). */
  protected readonly pages = signal<number[]>([]);

  private readonly topSentinel = viewChild<ElementRef<HTMLDivElement>>('topSentinel');
  private readonly bottomSentinel = viewChild<ElementRef<HTMLDivElement>>('bottomSentinel');
  private observer?: IntersectionObserver;
  private prependPending = false;

  protected readonly firstRendered = computed(() => {
    const list = this.pages();
    return list.length ? list[0] : this.first();
  });
  protected readonly lastPage = computed(() => {
    const list = this.pages();
    return list.length ? list[list.length - 1] : this.first();
  });
  protected readonly hasPrev = computed(() => this.firstRendered() > this.startPage());
  protected readonly hasMore = computed(() => this.lastPage() < this.endPage());
  /** The page the highlighted ayah sits on (the initial page), or null. */
  protected readonly highlightPage = computed(() => (this.highlightAyah() ? this.first() : null));

  private first(): number {
    const initial = this.initialPage();
    const start = this.startPage();
    const end = this.endPage();
    const base = initial && initial >= start && initial <= end ? initial : start;
    return base;
  }

  constructor() {
    // (Re)initialise the page list whenever the surah/edition/target changes.
    effect(() => {
      this.slug();
      this.startPage();
      this.endPage();
      this.initialPage();
      this.pages.set([this.first()]);
    });
  }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (entry.target === this.topSentinel()?.nativeElement) {
            this.loadPrev();
          } else if (entry.target === this.bottomSentinel()?.nativeElement) {
            this.loadNext();
          }
        }
      },
      { rootMargin: '600px 0px' }
    );
    const top = this.topSentinel()?.nativeElement;
    const bottom = this.bottomSentinel()?.nativeElement;
    if (top) this.observer.observe(top);
    if (bottom) this.observer.observe(bottom);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private loadPrev(): void {
    if (!this.hasPrev() || this.prependPending) return;
    this.prependPending = true;
    const scroller = document.documentElement;
    const before = scroller.scrollHeight;
    this.pages.update((list) => [list[0] - 1, ...list]);
    afterNextRender(
      () => {
        scroller.scrollTop += document.documentElement.scrollHeight - before;
        this.prependPending = false;
      },
      { injector: this.injector }
    );
  }

  private loadNext(): void {
    if (!this.hasMore()) return;
    this.pages.update((list) => [...list, this.lastPage() + 1]);
  }
}
