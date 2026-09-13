import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { StateMessageComponent } from '../../../../shared/components/state-message/state-message.component';
import { MushafSwitcherComponent } from '../../components/mushaf-switcher/mushaf-switcher.component';
import { SuraCardComponent } from '../../components/sura-card/sura-card.component';
import { MushafSurahMeta } from '../../models/mushaf.model';
import { MushafSelectionService } from '../../services/mushaf-selection.service';
import { MushafSvgService } from '../../services/mushaf-svg.service';

@Component({
  selector: 'app-mushaf-sura-index',
  standalone: true,
  imports: [SuraCardComponent, MushafSwitcherComponent, StateMessageComponent, TranslateModule],
  templateUrl: './sura-index.page.html',
  styleUrl: './sura-index.page.less',
})
export class SuraIndexPage implements OnInit {
  private readonly svgService = inject(MushafSvgService);
  private readonly selection = inject(MushafSelectionService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly surahs = signal<MushafSurahMeta[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorState = signal(false);
  protected readonly selected = this.selection.selected;

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const edition = this.selection.select(params['mushaf']);
      this.loadSurahs(edition.slug);
    });
  }

  protected loadSurahs(slug: string): void {
    this.loading.set(true);
    this.errorState.set(false);
    this.svgService
      .getSurahs(slug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (surahs) => {
          this.surahs.set(surahs);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.errorState.set(true);
        },
      });
  }

  protected retry(): void {
    this.loadSurahs(this.selected().slug);
  }
}
