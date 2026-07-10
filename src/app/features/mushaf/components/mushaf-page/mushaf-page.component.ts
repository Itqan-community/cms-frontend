import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { StateMessageComponent } from '../../../../shared/components/state-message/state-message.component';
import { MushafSvgService } from '../../services/mushaf-svg.service';

/** Identifies a clicked/selected ayah within a mushaf page. */
export interface AyahRef {
  surah: number;
  ayah: number;
}

/**
 * Renders one mushaf page as inlined SVG (from the quranpedia quran-svg CDN),
 * wires hover/click on the `.ayahPolygon` hit-regions, keeps a single global
 * highlight, and scrolls a target ayah into view.
 */
@Component({
  selector: 'app-mushaf-page',
  standalone: true,
  imports: [StateMessageComponent, TranslateModule],
  templateUrl: './mushaf-page.component.html',
  styleUrl: './mushaf-page.component.less',
})
export class MushafPageComponent implements AfterViewInit {
  private readonly svgService = inject(MushafSvgService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sanitizer = inject(DomSanitizer);

  /** Mushaf edition slug, e.g. "hafs-kfqc". */
  slug = input.required<string>();
  /** Mushaf page number (1..604 or variant base). */
  page = input.required<number>();
  /** Ayah to highlight + scroll into view, or null. */
  highlightAyah = input<AyahRef | null>(null);

  ayahClick = output<AyahRef>();

  protected readonly loading = signal(true);
  protected readonly errorState = signal(false);
  protected readonly svgMarkup = signal<string>('');
  /** Sanitized SVG for [innerHTML]; trusted because the origin is the fixed jsDelivr CDN. */
  protected readonly safeSvg = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this.svgMarkup())
  );

  private readonly container = viewChild<ElementRef<HTMLDivElement>>('svgHost');
  private viewReady = signal(false);

  /** A stable key so the SVG fetch effect re-runs only on slug/page change. */
  private readonly source = computed(() => ({ slug: this.slug(), page: this.page() }));

  constructor() {
    // Fetch + inline the page SVG whenever slug/page changes.
    effect(() => {
      const { slug, page } = this.source();
      this.loadPage(slug, page);
    });

    // Re-apply interactivity once markup is in the DOM and the view is ready.
    effect(() => {
      if (!this.viewReady() || !this.svgMarkup()) return;
      // Defer to allow innerHTML binding to flush.
      queueMicrotask(() => this.wireSvg());
    });

    // Update highlight when the target ayah changes.
    effect(() => {
      const target = this.highlightAyah();
      if (!this.viewReady() || !this.svgMarkup()) return;
      queueMicrotask(() => this.applyHighlight(target));
    });
  }

  ngAfterViewInit(): void {
    this.viewReady.set(true);
  }

  protected loadPage(slug: string, page: number): void {
    this.loading.set(true);
    this.errorState.set(false);
    this.svgService
      .getPageSvg(slug, page)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (svg) => {
          this.svgMarkup.set(svg);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorState.set(true);
        },
      });
  }

  protected retry(): void {
    this.loadPage(this.slug(), this.page());
  }

  /** Attach click/hover handlers to every ayah polygon in the inlined SVG. */
  private wireSvg(): void {
    const host = this.container()?.nativeElement;
    if (!host) return;
    const polygons = host.querySelectorAll<SVGPathElement>('path.ayahPolygon');
    polygons.forEach((poly) => {
      poly.style.cursor = 'pointer';
      poly.addEventListener('click', () => {
        const ref = this.readAyahRef(poly);
        if (ref) this.ayahClick.emit(ref);
      });
    });
    this.applyHighlight(this.highlightAyah());
  }

  private readAyahRef(poly: Element): AyahRef | null {
    const surah = Number(poly.getAttribute('surah'));
    const ayah = Number(poly.getAttribute('ayah'));
    if (!surah || !ayah) return null;
    return { surah, ayah };
  }

  /** Single global highlight: clear all, mark the target, scroll it into view. */
  private applyHighlight(target: AyahRef | null): void {
    const host = this.container()?.nativeElement;
    if (!host) return;
    host
      .querySelectorAll('path.ayahPolygon.is-highlighted')
      .forEach((el) => el.classList.remove('is-highlighted'));
    if (!target) return;
    const selector = `path.ayahPolygon[surah="${target.surah}"][ayah="${target.ayah}"]`;
    const matches = host.querySelectorAll(selector);
    matches.forEach((el) => el.classList.add('is-highlighted'));
    const first = matches[0] as SVGGraphicsElement | undefined;
    first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
