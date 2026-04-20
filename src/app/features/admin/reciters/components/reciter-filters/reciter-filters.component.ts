import {
  Component,
  DestroyRef,
  EventEmitter,
  OnInit,
  OnChanges,
  SimpleChanges,
  Input,
  Output,
  inject,
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
      <div class="reciter-filters__actions">
        <nz-input-group [nzPrefix]="searchIcon" class="reciter-filters__search">
          <input
            nz-input
            nzSize="default"
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
          nzSize="default"
          class="reciter-filters__filters-btn"
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
export class ReciterFiltersComponent implements OnInit, OnChanges {
  @Output() filtersChange = new EventEmitter<Partial<ReciterListFilters>>();
  @Input() searchValue = '';

  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  isFiltersModalOpen = false;

  private currentFilters: Partial<ReciterListFilters> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['searchValue'] && !changes['searchValue'].firstChange) {
      this.currentFilters = { ...this.currentFilters, search: this.searchValue || undefined };
    }
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
