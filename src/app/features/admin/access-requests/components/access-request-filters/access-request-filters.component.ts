import {
  Component,
  DestroyRef,
  EventEmitter,
  Output,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { AccessRequestStatus } from '../../models/access-requests.models';

export interface AccessRequestFiltersPayload {
  search?: string;
  status?: AccessRequestStatus;
}

@Component({
  selector: 'app-access-request-filters',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, NzSelectModule, NgIcon, TranslateModule],
  template: `
    <div class="access-request-filters">
      <div class="admin-filters-bar">
        <nz-input-group [nzPrefix]="searchIcon">
          <input
            nz-input
            type="text"
            [placeholder]="'ADMIN.ACCESS_REQUESTS.SEARCH_PLACEHOLDER' | translate"
            [ngModel]="searchValue"
            (ngModelChange)="onSearchChange($event)"
          />
        </nz-input-group>
        <ng-template #searchIcon><ng-icon name="lucideSearch" /></ng-template>

        <nz-select
          class="access-request-filters__select access-request-filters__select--status"
          nzAllowClear
          nzShowArrow
          [nzPlaceHolder]="'ADMIN.ACCESS_REQUESTS.FILTERS.STATUS' | translate"
          nzSize="default"
          [ngModel]="selectedStatus"
          (ngModelChange)="onStatusChange($event)"
        >
          @for (s of statusOptions; track s) {
            <nz-option [nzValue]="s" [nzLabel]="statusLabel(s)"></nz-option>
          }
        </nz-select>

        <button nz-button nzType="default" type="button" (click)="clearFilters()">
          {{ 'ADMIN.COMMON.FILTER_CLEAR' | translate }}
        </button>
      </div>
    </div>
  `,
  styleUrl: './access-request-filters.component.less',
})
export class AccessRequestFiltersComponent {
  @Output() readonly filtersChange = new EventEmitter<AccessRequestFiltersPayload>();

  readonly initialFilters = input<Record<string, string | number | undefined>>({});

  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  readonly statusOptions: AccessRequestStatus[] = ['pending', 'approved', 'rejected'];

  searchValue = '';
  selectedStatus: AccessRequestStatus | null = null;

  constructor() {
    effect(() => {
      const raw = this.initialFilters() || {};
      untracked(() => this.hydrate(raw));
    });

    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.emit({ search: term || undefined });
      });
  }

  statusLabel(s: AccessRequestStatus): string {
    return this.translate.instant(`ADMIN.ACCESS_REQUESTS.STATUS.${s.toUpperCase()}`);
  }

  private hydrate(raw: Record<string, string | number | undefined>): void {
    this.searchValue = raw['search'] != null ? String(raw['search']) : '';
    const st = raw['status'];
    this.selectedStatus = st === 'pending' || st === 'approved' || st === 'rejected' ? st : null;
  }

  onSearchChange(value: string): void {
    this.searchValue = value;
    this.searchSubject.next(value);
  }

  onStatusChange(value: AccessRequestStatus | null): void {
    this.selectedStatus = value;
    this.emit({ status: value ?? undefined });
  }

  clearFilters(): void {
    this.searchValue = '';
    this.selectedStatus = null;
    this.filtersChange.emit({});
  }

  private emit(partial: Partial<AccessRequestFiltersPayload>): void {
    this.filtersChange.emit({
      search: partial.search !== undefined ? partial.search : this.searchValue || undefined,
      status: partial.status !== undefined ? partial.status : (this.selectedStatus ?? undefined),
    });
  }
}
