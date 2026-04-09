import {
  Component,
  DestroyRef,
  EventEmitter,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Licenses } from '../../../../../core/enums/licenses.enum';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NgIcon } from '@ng-icons/core';
import { PublishersFilterService } from '../../services/publishers-filter.service';
import { PublisherFilterItem, TafsirFilters } from '../../models/tafsirs.models';
import { localizeLanguageCode } from '../../../utils/display-localization.util';

@Component({
  selector: 'app-tafsir-filters',
  standalone: true,
  imports: [FormsModule, NzInputModule, NzSelectModule, NgIcon],
  template: `
    <div class="tafsir-filters" dir="rtl">
      <!-- Search -->
      <nz-input-group [nzPrefix]="searchIcon" class="tafsir-filters__search">
        <input
          nz-input
          type="text"
          placeholder="ابحث عن تفسير..."
          [ngModel]="searchValue"
          (ngModelChange)="onSearchChange($event)"
        />
      </nz-input-group>
      <ng-template #searchIcon><ng-icon name="lucideSearch" /></ng-template>

      <!-- Publisher filter (server-searchable) -->
      <nz-select
        class="tafsir-filters__select"
        nzPlaceHolder="الناشر"
        nzAllowClear
        nzShowSearch
        nzServerSearch
        [nzLoading]="publishersLoading()"
        [ngModel]="selectedPublisher"
        (ngModelChange)="onPublisherChange($event)"
        (nzOnSearch)="onPublisherSearch($event)"
      >
        @for (pub of publisherOptions(); track pub.id) {
          <nz-option [nzValue]="pub.id" [nzLabel]="pub.name"></nz-option>
        }
      </nz-select>

      <!-- License filter -->
      <nz-select
        class="tafsir-filters__select"
        nzPlaceHolder="الترخيص"
        nzAllowClear
        [ngModel]="selectedLicense"
        (ngModelChange)="onLicenseChange($event)"
      >
        @for (l of licenseOptions; track l) {
          <nz-option [nzValue]="l" [nzLabel]="l"></nz-option>
        }
      </nz-select>

      <!-- Language filter -->
      <nz-select
        class="tafsir-filters__select"
        nzPlaceHolder="اللغة"
        nzAllowClear
        [ngModel]="selectedLanguage"
        (ngModelChange)="onLanguageChange($event)"
      >
        <nz-option nzValue="ar" [nzLabel]="languageLabel('ar')"></nz-option>
        <nz-option nzValue="en" [nzLabel]="languageLabel('en')"></nz-option>
      </nz-select>

      <!-- Is External filter -->
      <nz-select
        class="tafsir-filters__select"
        nzPlaceHolder="النوع"
        nzAllowClear
        [ngModel]="selectedExternal"
        (ngModelChange)="onExternalChange($event)"
      >
        <nz-option [nzValue]="true" nzLabel="خارجي"></nz-option>
        <nz-option [nzValue]="false" nzLabel="داخلي"></nz-option>
      </nz-select>
    </div>
  `,
  styleUrl: './tafsir-filters.component.less',
})
export class TafsirFiltersComponent implements OnInit {
  @Output() filtersChange = new EventEmitter<Partial<TafsirFilters>>();

  private readonly publishersFilterService = inject(PublishersFilterService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  readonly licenseOptions = Object.values(Licenses);
  readonly publisherOptions = signal<PublisherFilterItem[]>([]);
  readonly publishersLoading = signal(false);

  searchValue = '';
  selectedPublisher: number | null = null;
  selectedLicense: string | null = null;
  selectedLanguage: 'ar' | 'en' | null = null;
  selectedExternal: boolean | null = null;

  private currentFilters: Partial<TafsirFilters> = {};

  ngOnInit(): void {
    this.loadPublishers();

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

  onPublisherSearch(query: string): void {
    this.loadPublishers(query);
  }

  onPublisherChange(id: number | null): void {
    this.selectedPublisher = id;
    this.currentFilters = { ...this.currentFilters, publisher_id: id ?? undefined };
    this.emit();
  }

  onLicenseChange(value: string | null): void {
    this.selectedLicense = value;
    this.currentFilters = { ...this.currentFilters, license_code: value ?? undefined };
    this.emit();
  }

  onLanguageChange(value: 'ar' | 'en' | null): void {
    this.selectedLanguage = value;
    this.currentFilters = { ...this.currentFilters, language: value ?? undefined };
    this.emit();
  }

  onExternalChange(value: boolean | null): void {
    this.selectedExternal = value;
    this.currentFilters = { ...this.currentFilters, is_external: value ?? undefined };
    this.emit();
  }

  private loadPublishers(query = ''): void {
    this.publishersLoading.set(true);
    this.publishersFilterService
      .search(query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.publisherOptions.set(res.results);
          this.publishersLoading.set(false);
        },
        error: () => {
          this.publishersLoading.set(false);
        },
      });
  }

  private emit(): void {
    this.filtersChange.emit(this.currentFilters);
  }

  languageLabel(code: string): string {
    return localizeLanguageCode(code, this.translate.currentLang);
  }
}
