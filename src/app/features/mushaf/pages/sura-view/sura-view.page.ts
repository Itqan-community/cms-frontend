import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
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

@Component({
  selector: 'app-mushaf-sura-view',
  standalone: true,
  imports: [
    RouterModule,
    MushafScrollComponent,
    MushafSwitcherComponent,
    StateMessageComponent,
    TranslateModule,
  ],
  templateUrl: './sura-view.page.html',
  styleUrl: './sura-view.page.less',
})
export class SuraViewPage implements OnInit {
  private readonly svgService = inject(MushafSvgService);
  private readonly selection = inject(MushafSelectionService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly surahMeta = signal<MushafSurahMeta | null>(null);
  protected readonly startPage = signal<number | null>(null);
  protected readonly endPage = signal<number | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorState = signal(false);
  protected readonly notFound = signal(false);
  protected readonly suraId = signal<number>(0);
  protected readonly selected = this.selection.selected;

  ngOnInit(): void {
    combineLatest([this.route.params, this.route.queryParams])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params, query]) => {
        const suraId = Number(params['suraId']);
        const edition = this.selection.select(query['mushaf']);
        this.suraId.set(suraId);
        this.loadSura(edition.slug, suraId);
      });
  }

  protected loadSura(slug: string, suraId: number): void {
    this.loading.set(true);
    this.errorState.set(false);
    this.notFound.set(false);

    if (!Number.isInteger(suraId) || suraId < 1 || suraId > 114) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    combineLatest([
      this.svgService.getSurahMeta(slug, suraId),
      this.svgService.getSurahPageRange(slug, suraId),
    ])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ([meta, range]) => {
          if (!meta || !range) {
            this.loading.set(false);
            this.notFound.set(true);
            return;
          }
          this.surahMeta.set(meta);
          this.startPage.set(range.startPage);
          this.endPage.set(range.endPage);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorState.set(true);
        },
      });
  }

  protected retry(): void {
    this.loadSura(this.selected().slug, this.suraId());
  }

  protected onAyahClick(ref: AyahRef): void {
    this.router.navigate(['/mushaf', ref.surah, ref.ayah], {
      queryParams: { mushaf: this.selected().slug },
    });
  }
}
