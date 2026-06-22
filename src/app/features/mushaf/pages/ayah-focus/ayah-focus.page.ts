import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { combineLatest } from 'rxjs';
import { NgIcon } from '@ng-icons/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { StateMessageComponent } from '../../../../shared/components/state-message/state-message.component';
import { AyahRef, MushafPageComponent } from '../../components/mushaf-page/mushaf-page.component';
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
    MushafPageComponent,
    MushafSwitcherComponent,
    StateMessageComponent,
    NgIcon,
    NzButtonModule,
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
  protected readonly page = signal<number | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorState = signal(false);
  protected readonly notFound = signal(false);
  protected readonly suraId = signal<number>(0);
  protected readonly ayahNumber = signal<number>(0);
  protected readonly selected = this.selection.selected;

  protected readonly ayahNumberLabel = computed(() => toArabicDigits(this.ayahNumber()));
  protected readonly highlight = computed<AyahRef>(() => ({
    surah: this.suraId(),
    ayah: this.ayahNumber(),
  }));
  protected readonly hasPrev = computed(() => this.ayahNumber() > 1);
  protected readonly hasNext = computed(() => {
    const meta = this.surahMeta();
    return meta ? this.ayahNumber() < meta.ayahCount : false;
  });

  private slug(): string {
    return this.selected().slug;
  }

  protected readonly prevLink = computed(() => ['/mushaf', this.suraId(), this.ayahNumber() - 1]);
  protected readonly nextLink = computed(() => ['/mushaf', this.suraId(), this.ayahNumber() + 1]);
  protected readonly suraLink = computed(() => ['/mushaf', this.suraId()]);
  protected readonly mushafQuery = computed(() => ({ mushaf: this.selected().slug }));

  ngOnInit(): void {
    combineLatest([this.route.params, this.route.queryParams])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, query]) => {
        const suraId = Number(params['suraId']);
        const ayahNumber = Number(params['ayahNumber']);
        const edition = this.selection.select(query['mushaf']);
        this.suraId.set(suraId);
        this.ayahNumber.set(ayahNumber);
        this.loadAyah(edition.slug, suraId, ayahNumber);
      });
  }

  protected loadAyah(slug: string, suraId: number, ayahNumber: number): void {
    this.loading.set(true);
    this.errorState.set(false);
    this.notFound.set(false);

    if (
      !Number.isInteger(suraId) ||
      suraId < 1 ||
      suraId > 114 ||
      !Number.isInteger(ayahNumber) ||
      ayahNumber < 1
    ) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    combineLatest([
      this.svgService.getSurahMeta(slug, suraId),
      this.svgService.resolvePage(slug, suraId, ayahNumber),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([meta, page]) => {
          if (!meta || !page) {
            this.loading.set(false);
            this.notFound.set(true);
            return;
          }
          this.surahMeta.set(meta);
          this.page.set(page);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorState.set(true);
        },
      });
  }

  protected retry(): void {
    this.loadAyah(this.slug(), this.suraId(), this.ayahNumber());
  }

  protected onAyahClick(ref: AyahRef): void {
    this.router.navigate(['/mushaf', ref.surah, ref.ayah], { queryParams: this.mushafQuery() });
  }
}
