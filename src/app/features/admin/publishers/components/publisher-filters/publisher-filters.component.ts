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
import { NgIcon } from '@ng-icons/core';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { PublisherUiFilters } from '../../models/publishers-stats.models';

@Component({
  selector: 'app-publisher-filters',
  standalone: true,
  imports: [FormsModule, NzInputModule, NzSelectModule, NgIcon],
  templateUrl: './publisher-filters.component.html',
  styleUrl: './publisher-filters.component.less',
})
export class PublisherFiltersComponent implements OnInit {
  @Output() filtersChange = new EventEmitter<PublisherUiFilters>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();
  private readonly countrySubject = new Subject<string>();

  searchValue = '';
  countryValue = '';
  selectedVerified: boolean | null = null;

  private current: PublisherUiFilters = {};

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.current = { ...this.current, search: term || undefined };
        this.emit();
      });

    this.countrySubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((c) => {
        this.current = { ...this.current, country: c || undefined };
        this.emit();
      });
  }

  onSearchChange(value: string): void {
    this.searchValue = value;
    this.searchSubject.next(value);
  }

  onCountryChange(value: string): void {
    this.countryValue = value;
    this.countrySubject.next(value);
  }

  onVerifiedChange(value: boolean | null): void {
    this.selectedVerified = value;
    const next = { ...this.current };
    if (value === null || value === undefined) {
      delete next.is_verified;
    } else {
      next.is_verified = value;
    }
    this.current = next;
    this.emit();
  }

  private emit(): void {
    this.filtersChange.emit(this.current);
  }
}
