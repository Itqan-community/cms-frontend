import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NgIcon } from '@ng-icons/core';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { QuranDataService, QuranPage } from '../../services/quran-data.service';

export interface MushafOption {
  id: string;
  nameKey: string;
  pageCount: number;
}

const MUSHAF_OPTIONS: MushafOption[] = [
  { id: 'medina', nameKey: 'ADMIN.MUSHAFS.MUSHAF_MEDINA', pageCount: 604 },
];

@Component({
  selector: 'app-mushaf-pages',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NgIcon,
    NzSelectModule,
    NzSpinModule,
    NzTableModule,
    NzTagModule,
    TranslateModule,
  ],
  templateUrl: './mushaf-pages.page.html',
  styleUrls: ['./mushaf-pages.page.less'],
})
export class MushafPagesPage implements OnInit {
  private readonly quranData = inject(QuranDataService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly el = inject(ElementRef);
  private readonly translate = inject(TranslateService);

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

  mushafOptionLabel(m: MushafOption): string {
    return this.translate.instant('ADMIN.MUSHAFS.SELECT_OPTION_LABEL', {
      name: this.translate.instant(m.nameKey),
      count: m.pageCount,
    });
  }

  mushafHint(m: MushafOption): string {
    return this.translate.instant('ADMIN.MUSHAFS.PAGES_HINT', {
      name: this.translate.instant(m.nameKey),
      count: m.pageCount,
    });
  }

  pagesTableTitle(m: MushafOption, count: number): string {
    return this.translate.instant('ADMIN.MUSHAFS.PAGES_TABLE_TITLE', {
      name: this.translate.instant(m.nameKey),
      count,
    });
  }

  mushafTag(m: MushafOption): string {
    return this.translate.instant('ADMIN.MUSHAFS.PAGES_TAG', {
      name: this.translate.instant(m.nameKey),
    });
  }

  juzTag(n: number): string {
    return this.translate.instant('ADMIN.MUSHAFS.JUZ_TAG', { n });
  }

  joinSurahNames(surahs: string[]): string {
    const sep = this.translate.instant('ADMIN.MUSHAFS.SURAH_LIST_JOINER');
    return surahs.join(sep);
  }
}
