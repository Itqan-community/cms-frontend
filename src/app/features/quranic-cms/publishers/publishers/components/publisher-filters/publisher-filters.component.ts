import { CommonModule } from '@angular/common';
import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { debounceTime, distinctUntilChanged, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-publisher-filters',
  standalone: true,
  imports: [CommonModule, FormsModule, NzInputModule, NzSelectModule, NzButtonModule],
  template: `
    <div class="filters-container">
      <div class="filter-bar-content">
        <div class="search-wrapper">
          <nz-input-group [nzSuffix]="suffixIconSearch">
            <input
              type="text"
              class="searchInput"
              nz-input
              placeholder="Search publisher"
              [(ngModel)]="searchTerm"
              (ngModelChange)="onSearchChange($event)"
            />
          </nz-input-group>
          <ng-template #suffixIconSearch>
            <i class="bx bx-search"></i>
          </ng-template>
        </div>

        <nz-select
          [(ngModel)]="activeFilter"
          (ngModelChange)="onFilterChange($event)"
          nzPlaceHolder="كل الانواع"
          class="type-select"
        >
          <nz-option nzLabel="كل الانواع" [nzValue]="null"></nz-option>
          <nz-option nzLabel="الموثوقين" [nzValue]="true"></nz-option>
          <nz-option nzLabel="غير الموثوقين" [nzValue]="false"></nz-option>
        </nz-select>
      </div>
    </div>
  `,
  styles: [
    `
      .filters-container {
        padding: 16px;
        border-radius: 12px;
        display: flex;
        align-items: center;
      }
      .filter-bar-content {
        display: flex;
        flex: 1;
        align-items: center;
        gap: 12px;
        height: 100%;
      }
      .search-wrapper {
        flex: 1;
        margin: 0;
      }
      ::ng-deep .search-wrapper .ant-input-affix-wrapper {
        background-color: #f5f5f5 !important;
        border-radius: 12px !important;
        border: none;
        height: 40px;
        display: flex;
        align-items: center;
      }
      ::ng-deep .type-select {
        width: 200px;
        margin: 0;
        display: flex;
        align-items: center;
      }
      ::ng-deep .type-select .ant-select-selector {
        background-color: #f5f5f5 !important;
        border-radius: 12px !important;
        border: none !important;
        height: 40px !important;
        display: flex !important;
        align-items: center !important;
      }
      ::ng-deep .type-select .ant-select-selection-placeholder {
        color: black !important;
        opacity: 1;
      }
    `,
  ],
})
export class PublisherFiltersComponent implements OnInit, OnDestroy {
  @Output() searchChanged = new EventEmitter<string>();
  @Output() filterChanged = new EventEmitter<boolean | null>();

  searchTerm: string = '';
  activeFilter: boolean | null = null;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((term) => {
        this.searchChanged.emit(term);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSearchChange(term: string): void {
    this.searchSubject.next(term);
  }

  onFilterChange(value: boolean | null): void {
    this.filterChanged.emit(value);
  }
}
