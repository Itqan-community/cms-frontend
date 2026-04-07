import {
  Component,
  DestroyRef,
  EventEmitter,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NATIONALITY } from '../../nationality.enum';
import { ReciterListFilters } from '../../models/reciters.models';

@Component({
  selector: 'app-reciter-filters',
  standalone: true,
  imports: [FormsModule, NzInputModule, NzSelectModule, NzIconModule],
  template: `
    <div class="reciter-filters" dir="rtl">
      <nz-input-group [nzPrefix]="searchIcon" class="reciter-filters__search">
        <input
          nz-input
          type="text"
          placeholder="ابحث عن قارئ..."
          [ngModel]="searchValue"
          (ngModelChange)="onSearchChange($event)"
        />
      </nz-input-group>
      <ng-template #searchIcon><span nz-icon nzType="search"></span></ng-template>

      <nz-select
        class="reciter-filters__select"
        nzPlaceHolder="الجنسية"
        nzAllowClear
        nzShowSearch
        [ngModel]="selectedNationality"
        (ngModelChange)="onNationalityChange($event)"
      >
        @for (code of nationalityOptions; track code) {
          <nz-option [nzValue]="code" [nzLabel]="code"></nz-option>
        }
      </nz-select>
    </div>
  `,
  styleUrl: './reciter-filters.component.less',
})
export class ReciterFiltersComponent implements OnInit {
  @Output() filtersChange = new EventEmitter<Partial<ReciterListFilters>>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  readonly nationalityOptions = Object.values(NATIONALITY);

  searchValue = '';
  selectedNationality: NATIONALITY | null = null;

  private currentFilters: Partial<ReciterListFilters> = {};

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

  onNationalityChange(value: NATIONALITY | null): void {
    this.selectedNationality = value;
    this.currentFilters = { ...this.currentFilters, nationality: value ?? undefined };
    this.emit();
  }

  private emit(): void {
    this.filtersChange.emit(this.currentFilters);
  }
}
