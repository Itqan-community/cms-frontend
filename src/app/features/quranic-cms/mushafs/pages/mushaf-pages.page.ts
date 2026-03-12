import { Component, DestroyRef, ElementRef, HostListener, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { QuranDataService, QuranPage } from '../../services/quran-data.service';

export interface MushafOption {
  id: string;
  name: string;
  pageCount: number;
}

const MUSHAF_OPTIONS: MushafOption[] = [
  { id: 'medina', name: 'مصحف المدينة', pageCount: 604 },
];

@Component({
  selector: 'app-mushaf-pages',
  standalone: true,
  imports: [],
  templateUrl: './mushaf-pages.page.html',
  styleUrls: ['./mushaf-pages.page.less'],
})
export class MushafPagesPage implements OnInit {
  private readonly quranData = inject(QuranDataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly el = inject(ElementRef);

  readonly mushafs: MushafOption[] = MUSHAF_OPTIONS;
  readonly selectedMushaf = signal<MushafOption>(MUSHAF_OPTIONS[0]);
  readonly pages = signal<QuranPage[]>([]);
  readonly loading = signal(true);
  readonly selectOpen = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target)) {
      this.selectOpen.set(false);
    }
  }

  ngOnInit(): void {
    this.quranData
      .getPages()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (pages) => {
          this.pages.set(pages);
          if (pages.length > 0) {
            this.loading.set(false);
          }
        },
        error: () => {
          this.loading.set(false);
        },
      });
  }

  toggleDropdown(): void {
    this.selectOpen.update((v) => !v);
  }

  selectMushaf(m: MushafOption): void {
    this.selectedMushaf.set(m);
    this.selectOpen.set(false);
  }
}
