import { isPlatformServer } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { NATIONALITY } from '../../../admin/reciters/nationality.enum';
import { localizeCountryCodeOrName } from '../../../admin/utils/display-localization.util';
import { SeoService } from '../../../../core/services/seo.service';
import { ViewportService } from '../../../../core/services/viewport.service';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { StateMessageComponent } from '../../../../shared/components/state-message/state-message.component';
import { ReciterCardComponent } from '../../components/reciter-card/reciter-card.component';
import { Reciter } from '../../models/reciter.model';
import { ReciterService } from '../../services/reciter.service';

interface NationalityOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-reciters-page',
  imports: [
    BreadcrumbComponent,
    ReciterCardComponent,
    StateMessageComponent,
    TranslateModule,
    FormsModule,
    NgIcon,
    NzInputModule,
    NzSelectModule,
    NzPaginationModule,
  ],
  templateUrl: './reciters.page.html',
  styleUrl: './reciters.page.less',
})
export class RecitersPage implements OnInit {
  private readonly reciterService = inject(ReciterService);
  private readonly seo = inject(SeoService);
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly viewportService = inject(ViewportService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject$ = new Subject<string>();

  isServer = isPlatformServer(this.platformId);

  reciters = signal<Reciter[]>([]);
  loading = signal<boolean>(true);
  errorState = signal<boolean>(false);

  searchQuery = signal<string>('');
  nationalitySelection = signal<string>('');

  readonly page = signal(1);
  readonly pageSize = signal(12);
  readonly total = signal(0);
  readonly pageSizeOptions: number[] = [12, 24, 48];

  /** Bumped on language change so `nationalityOptions` recomputes instead of rebuilding on every CD tick. */
  private readonly languageTick = signal(0);

  readonly nationalityOptions = computed<NationalityOption[]>(() => {
    this.languageTick();
    const lang = this.translate.currentLang;
    const empty = this.translate.instant('COMMON.EM_DASH');
    return Object.values(NATIONALITY).map((code) => ({
      label: localizeCountryCodeOrName(code, lang, { empty }),
      value: code,
    }));
  });

  ngOnInit(): void {
    this.setSeo(this.translate.currentLang || 'ar');
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((e) => {
      this.setSeo(e.lang);
      this.languageTick.update((n) => n + 1);
    });

    this.searchSubject$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.page.set(1);
        this.getReciters();
      });

    this.getReciters();
  }

  private setSeo(lang: string): void {
    const isAr = lang === 'ar';
    this.seo.setSeo({
      title: isAr ? 'القراء | إتقان' : 'Quran Reciters | ITQAN',
      description: isAr
        ? 'تصفح وابحث في قائمة قراء القرآن الكريم على منصة إتقان.'
        : 'Browse and search Quran reciters on the ITQAN platform.',
      path: '/reciters',
    });
  }

  getSkeletonArray() {
    if (this.isServer) {
      return [];
    }
    const count = this.viewportService.isMobile() ? 4 : 8;
    return Array.from({ length: count });
  }

  getReciters(): void {
    this.loading.set(true);
    this.errorState.set(false);
    this.reciterService
      .getReciters(this.searchQuery(), this.nationalitySelection(), this.page(), this.pageSize())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          this.reciters.set(response.results);
          this.total.set(response.count ?? response.results.length);
          this.loading.set(false);
        },
        error: () => {
          this.reciters.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.errorState.set(true);
        },
      });
  }

  onSearchQueryChange(value: string): void {
    this.searchSubject$.next(value);
  }

  onNationalityChange(value: string | null): void {
    this.nationalitySelection.set(value ?? '');
    this.page.set(1);
    this.getReciters();
  }

  onPageChange(index: number): void {
    this.page.set(index);
    this.getReciters();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.page.set(1);
    this.getReciters();
  }
}
