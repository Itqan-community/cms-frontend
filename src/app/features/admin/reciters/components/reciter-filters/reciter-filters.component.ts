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
import { NgIcon } from '@ng-icons/core';
import { ReciterListFilters } from '../../models/reciters.models';

@Component({
  selector: 'app-reciter-filters',
  standalone: true,
  imports: [FormsModule, NzInputModule, NgIcon],
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
      <ng-template #searchIcon><ng-icon name="lucideSearch" /></ng-template>
    </div>
  `,
  styleUrl: './reciter-filters.component.less',
})
export class ReciterFiltersComponent implements OnInit {
  @Output() filtersChange = new EventEmitter<Partial<ReciterListFilters>>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  searchValue = '';

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

  private emit(): void {
    this.filtersChange.emit(this.currentFilters);
  }
}
