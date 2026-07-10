import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { AyahRef, MushafPageComponent } from '../mushaf-page/mushaf-page.component';

/**
 * Infinite-scrolls a surah as a vertical stack of mushaf pages. Starts at
 * `initialPage` (defaulting to the surah's first page) and lazily appends the
 * next page as a bottom sentinel enters the viewport, up to `endPage`.
 */
@Component({
  selector: 'app-mushaf-scroll',
  standalone: true,
  imports: [MushafPageComponent],
  templateUrl: './mushaf-scroll.component.html',
  styleUrl: './mushaf-scroll.component.less',
})
export class MushafScrollComponent implements AfterViewInit, OnDestroy {
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

  private readonly sentinel = viewChild<ElementRef<HTMLDivElement>>('sentinel');
  private observer?: IntersectionObserver;

  protected readonly lastPage = computed(() => {
    const list = this.pages();
    return list.length ? list[list.length - 1] : this.first();
  });
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
      // Track inputs so the effect re-runs on change.
      this.slug();
      this.startPage();
      this.endPage();
      this.initialPage();
      this.pages.set([this.first()]);
    });
  }

  ngAfterViewInit(): void {
    const el = this.sentinel()?.nativeElement;
    if (!el) return;
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) this.loadNext();
      },
      { rootMargin: '600px 0px' }
    );
    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private loadNext(): void {
    if (!this.hasMore()) return;
    this.pages.update((list) => [...list, this.lastPage() + 1]);
  }
}
