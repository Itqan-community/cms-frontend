import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';

export interface RecitationFilters {
  search: string;
  riwayah: string;
  type: string;
}

@Component({
  selector: 'app-recitation-search',
  standalone: true,
  imports: [FormsModule, NzInputModule, NzSelectModule, NzIconModule, NzButtonModule],
  template: `
    <div class="search-bar-container">
      <div class="search-bar__input-wrapper">
        <nz-input-group [nzPrefix]="prefixIconSearch">
          <input
            type="text"
            nz-input
            placeholder="ابحث باسم القارئ (عربي أو إنجليزي)..."
            [(ngModel)]="filters.search"
            (input)="onSearchInput()"
          />
        </nz-input-group>
        <ng-template #prefixIconSearch>
          <span nz-icon nzType="search"></span>
        </ng-template>
      </div>

      <div class="search-bar__filters">
        <nz-select
          nzPlaceHolder="تصفية حسب الرواية"
          [(ngModel)]="filters.riwayah"
          (ngModelChange)="onFilterChange()"
          nzAllowClear
        >
          <nz-option nzValue="حفص عن عاصم" nzLabel="حفص عن عاصم"></nz-option>
          <nz-option nzValue="ورش عن نافع" nzLabel="ورش عن نافع"></nz-option>
        </nz-select>

        <nz-select
          nzPlaceHolder="نوع التلاوة"
          [(ngModel)]="filters.type"
          (ngModelChange)="onFilterChange()"
          nzAllowClear
        >
          <nz-option nzValue="مرتل" nzLabel="مرتل"></nz-option>
          <nz-option nzValue="مجود" nzLabel="مجود"></nz-option>
          <nz-option nzValue="معلم" nzLabel="معلم"></nz-option>
        </nz-select>
      </div>

      <div class="search-bar__actions">
        <button nz-button nzType="primary" class="add-btn">
          <i class="bx bx-plus"></i> إضافة مصحف
        </button>
      </div>
    </div>
  `,
  styleUrl: './recitation-search.component.less',
})
export class RecitationSearchComponent {
  @Output() filtersChanged = new EventEmitter<RecitationFilters>();

  filters: RecitationFilters = {
    search: '',
    riwayah: '',
    type: '',
  };

  private searchTimeout: any;

  onSearchInput(): void {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    // Debounce the search input
    this.searchTimeout = setTimeout(() => {
      this.filtersChanged.emit(this.filters);
    }, 400);
  }

  onFilterChange(): void {
    this.filtersChanged.emit(this.filters);
  }
}
