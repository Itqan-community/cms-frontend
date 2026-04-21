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
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { NATIONALITY } from '../../../reciters/nationality.enum';
import { PublisherUiFilters } from '../../models/publishers-stats.models';
import { AdminCountryLabelPipe } from '../../../pipes/admin-country-label.pipe';

@Component({
  selector: 'app-publisher-filters',
  standalone: true,
  imports: [
    FormsModule,
    NzInputModule,
    NzSelectModule,
    NzButtonModule,
    NzModalModule,
    NgIcon,
    TranslateModule,
    AdminCountryLabelPipe,
  ],
  templateUrl: './publisher-filters.component.html',
  styleUrl: './publisher-filters.component.less',
})
export class PublisherFiltersComponent implements OnInit {
  @Output() filtersChange = new EventEmitter<PublisherUiFilters>();
  initialFilters = input<PublisherUiFilters>({});

  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);
  private readonly searchSubject = new Subject<string>();
  readonly countryOptions = Object.values(NATIONALITY);

  searchValue = '';
  selectedCountry: string | null = null;
  // selectedVerified: boolean | null = null; // is_verified (commented out — do not delete)
  isFiltersModalOpen = false;

  private current: PublisherUiFilters = {};

  constructor() {
    effect(() => {
      const f = this.initialFilters();
      untracked(() => {
        this.current = { ...f };
        this.searchValue = f.search || '';
        this.selectedCountry = f.country ?? null;
        // if (f.is_verified !== undefined) this.selectedVerified = f.is_verified;
      });
    });
  }

  ngOnInit(): void {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.current = { ...this.current, search: term || undefined };
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

  clearAdvancedFilters(): void {
    this.selectedCountry = null;
    // this.selectedVerified = null;
    this.current = {
      ...this.current,
      country: undefined,
      // is_verified: undefined,
    };
    this.emit();
  }

  onCountryChange(value: string | null): void {
    this.selectedCountry = value;
    this.current = { ...this.current, country: value ?? undefined };
    this.emit();
  }

  /* is_verified (commented out — do not delete)
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
  */

  private emit(): void {
    this.filtersChange.emit(this.current);
  }
}
