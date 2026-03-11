import { DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { QuranWord, QuranDataService } from '../../services/quran-data.service';
import { SURAHS_METADATA, SurahMetadata } from '../../models/quran-metadata';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-words-page',
  standalone: true,
  imports: [
    DecimalPipe,
    FormsModule,
    NzInputModule,
    NzPaginationModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
  ],
  templateUrl: './words.page.html',
  styleUrls: ['./words.page.less'],
})
export class WordsPage implements OnInit {
  private readonly quranDataService = inject(QuranDataService);

  readonly surahs: SurahMetadata[] = SURAHS_METADATA;

  allWords = signal<QuranWord[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  selectedSurah = signal<number | null>(null);
  currentPage = signal(1);
  pageSize = PAGE_SIZE;

  filteredWords = computed(() => {
    let words = this.allWords();
    const surahId = this.selectedSurah();
    const query = this.searchQuery().trim();

    if (surahId) {
      words = words.filter((w) => w.surah_id === surahId);
    }

    if (query) {
      words = words.filter(
        (w) =>
          w.text_uthmani.includes(query) ||
          w.text_spelling.includes(query)
      );
    }

    return words;
  });

  totalFiltered = computed(() => this.filteredWords().length);

  paginatedWords = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredWords().slice(start, start + this.pageSize);
  });

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.quranDataService.getWords().subscribe({
      next: (words) => this.allWords.set(words),
      complete: () => this.loading.set(false),
    });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.searchQuery.set(value);
      this.currentPage.set(1);
    }, 400);
  }

  onSurahChange(surahId: number | null): void {
    this.selectedSurah.set(surahId);
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.selectedSurah.set(null);
    this.currentPage.set(1);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }
}
