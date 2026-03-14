import { Component, DestroyRef, inject, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { QuranDataService, QuranWord, SurahStats } from '../../services/quran-data.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mushaf-words',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './mushaf-words.page.html',
  styleUrls: ['./mushaf-words.page.less'],
})
export class MushafWordsPage implements OnInit {
  private readonly quranData = inject(QuranDataService);
  private readonly destroyRef = inject(DestroyRef);

  readonly allWords = signal<QuranWord[]>([]);
  readonly surahs = signal<SurahStats[]>([]);
  readonly loading = signal(true);

  readonly searchTerm = signal<string>('');
  readonly selectedSurahId = signal<number | null>(null);

  readonly currentPage = signal<number>(1);
  readonly pageSize = signal<number>(25);

  // Computeds for filtering and pagination
  readonly filteredWords = computed(() => {
    let words = this.allWords();
    const term = this.searchTerm().trim();
    const surahId = this.selectedSurahId();

    if (surahId !== null && surahId !== undefined && String(surahId) !== 'null') {
      words = words.filter((w) => w.surah_id === Number(surahId));
    }

    if (term) {
      words = words.filter((w) => w.text_uthmani.includes(term) || w.text_spelling.includes(term));
    }

    return words;
  });

  readonly totalResults = computed(() => this.filteredWords().length);
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalResults() / this.pageSize()))
  );

  readonly paginatedWords = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredWords().slice(start, start + this.pageSize());
  });

  ngOnInit(): void {
    // Load words
    this.quranData
      .getWords()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (words) => {
          this.allWords.set(words);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });

    // Load surahs
    this.quranData
      .getSurahs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (surahs) => this.surahs.set(surahs),
      });
  }

  onSearchChange(term: string) {
    this.searchTerm.set(term);
    this.currentPage.set(1);
  }

  onSurahChange(surahId: any) {
    const sid = surahId === 'null' || surahId === null ? null : Number(surahId);
    this.selectedSurahId.set(sid);
    this.currentPage.set(1);
  }

  clearFilters() {
    this.searchTerm.set('');
    this.selectedSurahId.set(null);
    this.currentPage.set(1);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }

  onPageSizeChange(event: Event) {
    const size = Number((event.target as HTMLSelectElement).value);
    this.pageSize.set(size);
    this.currentPage.set(1);
  }
}
