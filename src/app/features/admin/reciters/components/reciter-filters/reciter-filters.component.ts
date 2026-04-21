import {
  Component,
  DestroyRef,
  EventEmitter,
  OnInit,
  Output,
  inject,
  input,
  effect,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { TranslateModule } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { ReciterListFilters } from '../../models/reciters.models';

@Component({
  selector: 'app-reciter-filters',
  standalone: true,
  imports: [FormsModule, NzInputModule, NzButtonModule, NzModalModule, NgIcon, TranslateModule],
  template: `
    <div class="reciter-filters">
      <div class="admin-filters-bar">
        <nz-input-group [nzPrefix]="searchIcon">
          <input
            nz-input
            type="text"
            [placeholder]="'ADMIN.RECITERS.SEARCH_PLACEHOLDER' | translate"
            [ngModel]="searchValue"
            (ngModelChange)="onSearchChange($event)"
          />
        </nz-input-group>
        <ng-template #searchIcon><ng-icon name="lucideSearch" /></ng-template>

        <button
          nz-button
          nzType="default"
          class="admin-filters-bar__filter-btn"
          (click)="openFiltersModal()"
        >
          <ng-icon name="lucideFilter" />
          <span>{{ 'ADMIN.RECITERS.FILTERS.BUTTON' | translate }}</span>
        </button>
      </div>

      <nz-modal
        [(nzVisible)]="isFiltersModalOpen"
        (nzOnCancel)="closeFiltersModal()"
        [nzTitle]="'ADMIN.RECITERS.FILTERS.MODAL_TITLE' | translate"
        [nzWidth]="'min(460px, 92vw)'"
        nzCentered
      >
        <ng-container *nzModalContent>
          <div class="reciter-filters__empty">
            {{ 'ADMIN.RECITERS.FILTERS.EMPTY_MESSAGE' | translate }}
          </div>
        </ng-container>
        <ng-container *nzModalFooter>
          <div class="reciter-filters__modal-footer">
            <button nz-button nzType="primary" nzSize="default" (click)="closeFiltersModal()">
              {{ 'ADMIN.RECITERS.FILTERS.DONE' | translate }}
            </button>
          </div>
        </ng-container>
      </nz-modal>
    </div>
  `,
  styleUrl: './reciter-filters.component.less',
})
export class ReciterFiltersComponent implements OnInit {
  @Output() filtersChange = new EventEmitter<Partial<ReciterListFilters>>();
  initialFilters = input<Partial<ReciterListFilters>>({});

  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  isFiltersModalOpen = false;
  searchValue = '';

  private currentFilters: Partial<ReciterListFilters> = {};

  constructor() {
    effect(() => {
      const f = this.initialFilters();
      untracked(() => {
        this.currentFilters = { ...f };
        this.searchValue = f.search || '';
      });
    });
  }

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.currentFilters = { ...this.currentFilters, search: term || undefined };
        this.emit();
      });
  }

  onSearchChange(value: string): void {
    this.searchValue = value;
    this.searchSubject.next(value);
  }

  openFiltersModal(): void {
    this.isFiltersModalOpen = true;
  }

  closeFiltersModal(): void {
    this.isFiltersModalOpen = false;
  }

  private emit(): void {
    this.filtersChange.emit(this.currentFilters);
  }
}
