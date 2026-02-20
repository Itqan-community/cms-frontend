import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTableModule, NzTableSortOrder } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { ToastService } from '../../../../shared/services/toast.service';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { Reciter } from '../../models/reciter.model';
import { RecitersService } from '../../services/reciters.service';

@Component({
  selector: 'app-reciters-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NzTableModule, NzTagModule, NzInputModule],
  templateUrl: './reciters-list.component.html',
  styleUrls: ['./reciters-list.component.less'],
})
export class RecitersListComponent implements OnInit {
  private readonly recitersService = inject(RecitersService);
  private readonly toast = inject(ToastService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  reciters = signal<Reciter[]>([]);
  loading = signal(true);
  total = signal(0);
  pageIndex = signal(1);
  pageSize = signal(10);
  sortField = signal('name_ar');
  sortOrder = signal<NzTableSortOrder>('ascend');
  searchQuery = signal('');

  private readonly searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((query) => {
        this.searchQuery.set(query);
        this.pageIndex.set(1);
        this.loadReciters();
      });

    this.loadReciters();
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  loadReciters(): void {
    this.loading.set(true);

    const ordering = this.sortOrder() === 'descend' ? `-${this.sortField()}` : this.sortField();

    this.recitersService
      .getReciters(ordering, this.pageIndex(), this.pageSize(), this.searchQuery())
      .subscribe({
        next: (response) => {
          this.reciters.set(response.results);
          this.total.set(response.count);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.toast.error(
            getErrorMessage(error) || this.translate.instant('RECITERS.LIST.ERRORS.LOAD_FAILED')
          );
        },
      });
  }

  onSortChange(field: string, order: NzTableSortOrder): void {
    this.sortField.set(field);
    this.sortOrder.set(order || 'ascend');
    this.pageIndex.set(1);
    this.loadReciters();
  }

  onPageChange(page: number): void {
    this.pageIndex.set(page);
    this.loadReciters();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.pageIndex.set(1);
    this.loadReciters();
  }
}
