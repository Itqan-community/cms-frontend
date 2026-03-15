import { Component, OnInit, inject, signal } from '@angular/core';
import { RecitationsService } from '../../services/recitations.service';
import { RecitationItem } from '../../models/recitations.models';
import { RecitationCardComponent } from '../recitation-card/recitation-card.component';
import { RecitationsBannerComponent } from '../recitations-banner/recitations-banner.component';
import { RecitationsStatsCardsComponent } from '../recitations-stats-cards/recitations-stats-cards.component';
import {
  RecitationSearchComponent,
  RecitationFilters,
} from '../recitation-search/recitation-search.component';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';

@Component({
  selector: 'app-recitation-list',
  standalone: true,
  imports: [
    NzPaginationModule,
    NzSpinModule,
    RecitationCardComponent,
    RecitationsBannerComponent,
    RecitationsStatsCardsComponent,
    RecitationSearchComponent,
  ],
  template: `
    <div class="recitations-page" dir="rtl">
      <app-recitations-banner></app-recitations-banner>
      <app-recitation-local-stats-cards></app-recitation-local-stats-cards>

      <app-recitation-search (filtersChanged)="onFiltersChanged($event)"></app-recitation-search>

      <div class="recitations-grid-container">
        <nz-spin [nzSpinning]="loading()">
          @if (recitations().length > 0) {
            <div class="recitations-grid">
              @for (item of recitations(); track item.id) {
                <div class="recitation-wrapper">
                  <app-recitation-card
                    [recitation]="item"
                    (delete)="onDelete($event)"
                  ></app-recitation-card>
                </div>
              }
            </div>
          } @else {
            @if (!loading()) {
              <div class="recitations-empty">
                <span class="recitations-empty__icon"><i class="bx bx-volume-full"></i></span>
                <p class="recitations-empty__title">لا يوجد مصاحف مسجلة</p>
                <p class="recitations-empty__subtitle">
                  لم يتم العثور على نتائج تطابق بحثك أو لم يتم إضافة مصاحف بعد.
                </p>
              </div>
            }
          }
        </nz-spin>
      </div>

      @if (totalItems() > pageSize() && !loading()) {
        <div class="pagination-wrapper">
          <nz-pagination
            [nzPageIndex]="page()"
            [nzTotal]="totalItems()"
            [nzPageSize]="pageSize()"
            (nzPageIndexChange)="onPageChange($event)"
          ></nz-pagination>
        </div>
      }
    </div>
  `,
  styleUrl: './recitation-list.component.less',
})
export class RecitationListComponent implements OnInit {
  private readonly recitationsService = inject(RecitationsService);
  private readonly messages = inject(NzMessageService);

  recitations = signal<RecitationItem[]>([]);
  loading = signal<boolean>(true);

  page = signal<number>(1);
  pageSize = signal<number>(12);
  totalItems = signal<number>(0);

  currentFilters = signal<RecitationFilters>({ search: '', riwayah: '', type: '' });

  ngOnInit() {
    this.loadRecitations();
  }

  loadRecitations() {
    this.loading.set(true);
    const { search, riwayah, type } = this.currentFilters();
    this.recitationsService
      .getRecitations(this.page(), this.pageSize(), search, riwayah, type)
      .subscribe({
        next: (res) => {
          this.recitations.set(res.results);
          this.totalItems.set(res.count);
          this.loading.set(false);
        },
        error: () => {
          this.messages.error('تعذر تحميل المصاحف الصوتية. يرجى المحاولة لاحقاً.');
          this.loading.set(false);
        },
      });
  }

  onFiltersChanged(filters: RecitationFilters) {
    this.currentFilters.set(filters);
    this.page.set(1);
    this.loadRecitations();
  }

  onPageChange(pageIndex: number) {
    this.page.set(pageIndex);
    this.loadRecitations();
  }

  onDelete(id: number) {
    // Optimistic UI update could be added here, OR reload.
    this.recitationsService.deleteRecitation(id).subscribe({
      next: () => {
        this.messages.success('تم حذف المصحف بنجاح');
        // reload grid
        this.loadRecitations();
      },
      error: () => {
        this.messages.error('حدث خطأ أثناء محاولة الحذف');
      },
    });
  }
}
