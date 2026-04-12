import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { take } from 'rxjs';
import { EnrichedAyah, QuranDataService } from '../../services/quran-data.service';
import { SURAHS_METADATA, SurahMetadata } from '../../models/quran-metadata';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-ayahs-page',
  standalone: true,
  imports: [
    FormsModule,
    NgIcon,
    NzInputModule,
    NzPaginationModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
    TranslateModule,
  ],
  templateUrl: './ayahs.page.html',
  styleUrls: ['./ayahs.page.less'],
})
export class AyahsPage implements OnInit {
  private readonly quranDataService = inject(QuranDataService);

  readonly surahs: SurahMetadata[] = SURAHS_METADATA;

  allAyahs = signal<EnrichedAyah[]>([]);
  loading = signal(true);
  searchQuery = signal('');
  selectedSurah = signal<number | null>(null);
  currentPage = signal(1);
  pageSize = PAGE_SIZE;

  filteredAyahs = computed(() => {
    let ayahs = this.allAyahs();
    const surahId = this.selectedSurah();
    const query = this.searchQuery().trim();

    if (surahId) {
      ayahs = ayahs.filter((a) => a.chapter === surahId);
    }

    if (query) {
      ayahs = ayahs.filter(
        (a) => a.searchableText.includes(query) || a.textWithoutTashkil.includes(query)
      );
    }

    return ayahs;
  });

  totalFiltered = computed(() => this.filteredAyahs().length);

  paginatedAyahs = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredAyahs().slice(start, start + this.pageSize);
  });

  private searchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void {
    this.quranDataService
      .getAyahs()
      .pipe(take(1))
      .subscribe((ayahs) => {
        this.allAyahs.set(ayahs);
        this.loading.set(false);
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

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }
}
