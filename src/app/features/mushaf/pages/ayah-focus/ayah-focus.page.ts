import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { combineLatest } from 'rxjs';
import { StateMessageComponent } from '../../../../shared/components/state-message/state-message.component';
import { AyahRef } from '../../components/mushaf-page/mushaf-page.component';
import { MushafScrollComponent } from '../../components/mushaf-scroll/mushaf-scroll.component';
import { MushafSwitcherComponent } from '../../components/mushaf-switcher/mushaf-switcher.component';
import { MushafSurahMeta } from '../../models/mushaf.model';
import { MushafSelectionService } from '../../services/mushaf-selection.service';
import { MushafSvgService } from '../../services/mushaf-svg.service';
import { toArabicDigits } from '../../utils/arabic-digits.util';

@Component({
  selector: 'app-mushaf-ayah-focus',
  standalone: true,
  imports: [
    RouterModule,
    MushafScrollComponent,
    MushafSwitcherComponent,
    StateMessageComponent,
    TranslateModule,
  ],
  templateUrl: './ayah-focus.page.html',
  styleUrl: './ayah-focus.page.less',
})
export class AyahFocusPage implements OnInit {
  private readonly svgService = inject(MushafSvgService);
  private readonly selection = inject(MushafSelectionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly surahMeta = signal<MushafSurahMeta | null>(null);
  protected readonly startPage = signal<number | null>(null);
  protected readonly endPage = signal<number | null>(null);
  protected readonly targetPage = signal<number | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorState = signal(false);
  protected readonly notFound = signal(false);
  protected readonly surahId = signal<number>(0);
  protected readonly ayahNumber = signal<number>(0);
  protected readonly selected = this.selection.selected;

  protected readonly ayahNumberLabel = computed(() => toArabicDigits(this.ayahNumber()));
  protected readonly highlight = computed<AyahRef>(() => ({
    surah: this.surahId(),
    ayah: this.ayahNumber(),
  }));

  private slug(): string {
    return this.selected().slug;
  }

  protected readonly surahLink = computed(() => ['/mushaf', this.surahId()]);
  protected readonly mushafQuery = computed(() => ({ mushaf: this.selected().slug }));

  ngOnInit(): void {
    combineLatest([this.route.params, this.route.queryParams])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, query]) => {
        const surahId = Number(params['surahId']);
        const ayahNumber = Number(params['ayahNumber']);
        const edition = this.selection.select(query['mushaf']);
        this.surahId.set(surahId);
        this.ayahNumber.set(ayahNumber);
        this.loadAyah(edition.slug, surahId, ayahNumber);
      });
  }

  protected loadAyah(slug: string, surahId: number, ayahNumber: number): void {
    this.loading.set(true);
    this.errorState.set(false);
    this.notFound.set(false);

    if (
      !Number.isInteger(surahId) ||
      surahId < 1 ||
      surahId > 114 ||
      !Number.isInteger(ayahNumber) ||
      ayahNumber < 1
    ) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    combineLatest([
      this.svgService.getSurahMeta(slug, surahId),
      this.svgService.getSurahPageRange(slug, surahId),
      this.svgService.resolvePage(slug, surahId, ayahNumber),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([meta, range, page]) => {
          if (!meta || !range || !page) {
            this.loading.set(false);
            this.notFound.set(true);
            return;
          }
          this.surahMeta.set(meta);
          this.startPage.set(range.startPage);
          this.endPage.set(range.endPage);
          this.targetPage.set(page);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorState.set(true);
        },
      });
  }

  protected retry(): void {
    this.loadAyah(this.slug(), this.surahId(), this.ayahNumber());
  }

  protected onAyahClick(ref: AyahRef): void {
    this.router.navigate(['/mushaf', ref.surah, ref.ayah], { queryParams: this.mushafQuery() });
  }
}
