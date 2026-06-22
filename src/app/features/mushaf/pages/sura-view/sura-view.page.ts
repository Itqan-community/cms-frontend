import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { StateMessageComponent } from '../../../../shared/components/state-message/state-message.component';
import { AyahViewComponent } from '../../components/ayah-view/ayah-view.component';
import { Ayah, Sura, Word } from '../../models/mushaf.model';
import { MushafService } from '../../services/mushaf.service';
import { toArabicDigits } from '../../utils/arabic-digits.util';

@Component({
  selector: 'app-mushaf-sura-view',
  standalone: true,
  imports: [RouterModule, AyahViewComponent, StateMessageComponent, TranslateModule],
  templateUrl: './sura-view.page.html',
  styleUrl: './sura-view.page.less',
})
export class SuraViewPage implements OnInit {
  private readonly mushafService = inject(MushafService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sura = signal<Sura | null>(null);
  protected readonly ayahs = signal<Ayah[]>([]);
  protected readonly loading = signal(true);
  protected readonly errorState = signal(false);
  protected readonly notFound = signal(false);
  protected readonly suraId = signal<number>(0);
  /** Single globally-selected word across the whole sura (one highlight at a time). */
  protected readonly selectedWordId = signal<number | null>(null);

  protected readonly ayahCountLabel = computed(() => {
    const sura = this.sura();
    return sura ? toArabicDigits(sura.ayas_count) : '';
  });

  protected onWordSelected(word: Word): void {
    this.selectedWordId.set(this.selectedWordId() === word.id ? null : word.id);
  }

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const suraId = Number(params['suraId']);
      this.suraId.set(suraId);
      this.loadSura(suraId);
    });
  }

  protected loadSura(suraId: number): void {
    this.loading.set(true);
    this.errorState.set(false);
    this.notFound.set(false);
    this.selectedWordId.set(null);

    if (!Number.isInteger(suraId) || suraId < 1) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    forkJoin({
      sura: this.mushafService.getSura(suraId),
      ayahs: this.mushafService.getSuraAyahs(suraId),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ sura, ayahs }) => {
          this.sura.set(sura);
          this.ayahs.set(ayahs);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          if (err instanceof HttpErrorResponse && err.status === 404) {
            this.notFound.set(true);
          } else {
            this.errorState.set(true);
          }
        },
      });
  }
}
