import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { NgIcon } from '@ng-icons/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { StateMessageComponent } from '../../../../shared/components/state-message/state-message.component';
import { WordChipComponent } from '../../components/word-chip/word-chip.component';
import { Ayah, Sura, Word } from '../../models/mushaf.model';
import { MushafService } from '../../services/mushaf.service';
import { toArabicDigits } from '../../utils/arabic-digits.util';

@Component({
  selector: 'app-mushaf-ayah-focus',
  standalone: true,
  imports: [
    RouterModule,
    WordChipComponent,
    StateMessageComponent,
    NgIcon,
    NzButtonModule,
    TranslateModule,
  ],
  templateUrl: './ayah-focus.page.html',
  styleUrl: './ayah-focus.page.less',
})
export class AyahFocusPage implements OnInit {
  private readonly mushafService = inject(MushafService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sura = signal<Sura | null>(null);
  protected readonly ayah = signal<Ayah | null>(null);
  protected readonly selectedWord = signal<Word | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorState = signal(false);
  protected readonly notFound = signal(false);
  protected readonly suraId = signal<number>(0);
  protected readonly ayahNumber = signal<number>(0);

  protected readonly ayahNumberLabel = computed(() => toArabicDigits(this.ayahNumber()));
  protected readonly hasPrev = computed(() => this.ayahNumber() > 1);
  protected readonly hasNext = computed(() => {
    const sura = this.sura();
    return sura ? this.ayahNumber() < sura.ayas_count : false;
  });
  protected readonly prevLink = computed(() => ['/mushaf', this.suraId(), this.ayahNumber() - 1]);
  protected readonly nextLink = computed(() => ['/mushaf', this.suraId(), this.ayahNumber() + 1]);
  protected readonly suraLink = computed(() => ['/mushaf', this.suraId()]);

  ngOnInit(): void {
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const suraId = Number(params['suraId']);
      const ayahNumber = Number(params['ayahNumber']);
      this.suraId.set(suraId);
      this.ayahNumber.set(ayahNumber);
      this.loadAyah(suraId, ayahNumber);
    });
  }

  protected loadAyah(suraId: number, ayahNumber: number): void {
    this.loading.set(true);
    this.errorState.set(false);
    this.notFound.set(false);
    this.selectedWord.set(null);

    if (
      !Number.isInteger(suraId) ||
      suraId < 1 ||
      !Number.isInteger(ayahNumber) ||
      ayahNumber < 1
    ) {
      this.loading.set(false);
      this.notFound.set(true);
      return;
    }

    forkJoin({
      sura: this.mushafService.getSura(suraId),
      ayah: this.mushafService.getAyah(suraId, ayahNumber),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ sura, ayah }) => {
          this.sura.set(sura);
          this.ayah.set(ayah);
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

  protected onWordClick(word: Word): void {
    this.selectedWord.set(this.selectedWord()?.id === word.id ? null : word);
  }
}
