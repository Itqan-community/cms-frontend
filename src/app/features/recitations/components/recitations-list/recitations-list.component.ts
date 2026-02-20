import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ToastService } from '../../../../shared/services/toast.service';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { Recitation } from '../../models/recitation.model';
import { RecitationCardComponent } from '../recitation-card/recitation-card.component';
import { RecitationsService } from '../../services/recitations.service';

export type ViewMode = 'table' | 'cards';

@Component({
  selector: 'app-recitations-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    NzTableModule,
    NzTagModule,
    NzInputModule,
    NzSelectModule,
    NzButtonModule,
    NzSpinModule,
    NzPaginationModule,
    RecitationCardComponent,
  ],
  templateUrl: './recitations-list.component.html',
  styleUrls: ['./recitations-list.component.less'],
})
export class RecitationsListComponent implements OnInit {
  private readonly recitationsService = inject(RecitationsService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  recitations = signal<Recitation[]>([]);
  loading = signal(true);
  total = signal(0);
  pageIndex = signal(1);
  pageSize = signal(12);
  viewMode = signal<ViewMode>('cards');

  searchQuery = signal('');
  riwayahFilter = signal('');
  recitationTypeFilter = signal('');

  private readonly searchSubject = new Subject<string>();

  readonly RIWAYAH_OPTIONS = [
    'حفص عن عاصم',
    'ورش عن نافع',
    'قالون عن نافع',
    'الدوري عن أبي عمرو',
    'شعبة عن عاصم',
  ];

  readonly RECITATION_TYPE_OPTIONS = ['مرتل', 'مجود', 'معلم', 'مع الترجمة'];

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.pageIndex.set(1);
        this.loadRecitations();
      });

    this.loadRecitations();
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  onRiwayahChange(value: string): void {
    this.riwayahFilter.set(value);
    this.pageIndex.set(1);
    this.loadRecitations();
  }

  onRecitationTypeChange(value: string): void {
    this.recitationTypeFilter.set(value);
    this.pageIndex.set(1);
    this.loadRecitations();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.riwayahFilter.set('');
    this.recitationTypeFilter.set('');
    this.pageIndex.set(1);
    this.loadRecitations();
  }

  get hasActiveFilters(): boolean {
    return !!this.searchQuery() || !!this.riwayahFilter() || !!this.recitationTypeFilter();
  }

  toggleView(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  loadRecitations(): void {
    this.loading.set(true);

    this.recitationsService
      .getRecitations(
        this.pageIndex(),
        this.pageSize(),
        this.searchQuery(),
        this.riwayahFilter(),
        this.recitationTypeFilter()
      )
      .subscribe({
        next: (response) => {
          this.recitations.set(response.results);
          this.total.set(response.count);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.toast.error(
            getErrorMessage(error) || this.translate.instant('RECITATIONS.LIST.ERRORS.LOAD_FAILED')
          );
        },
      });
  }

  onDeleteRecitation(id: number): void {
    this.recitationsService.deleteRecitation(id).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('RECITATIONS.CARDS.DELETE_SUCCESS'));
        this.loadRecitations();
      },
      error: (error: unknown) => {
        this.toast.error(
          getErrorMessage(error) || this.translate.instant('RECITATIONS.CARDS.DELETE_FAILED')
        );
      },
    });
  }

  onPageChange(page: number): void {
    this.pageIndex.set(page);
    this.loadRecitations();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(1);
    this.loadRecitations();
  }
}
