import {
  Component,
  DestroyRef,
  EventEmitter,
  OnInit,
  Output,
  inject,
  signal,
  input,
  effect,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Licenses } from '../../../../../core/enums/licenses.enum';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NgIcon } from '@ng-icons/core';
import { PublishersFilterService } from '../../../tafsirs/services/publishers-filter.service';
import { PublisherFilterItem, TranslationFilters } from '../../models/translations.models';
import { localizeLanguageCode } from '../../../utils/display-localization.util';

@Component({
  selector: 'app-translation-filters',
  standalone: true,
  imports: [
    FormsModule,
    NzInputModule,
    NzSelectModule,
    NzButtonModule,
    NzModalModule,
    NgIcon,
    TranslateModule,
  ],
  template: `
    <div class="translation-filters">
      <div class="admin-filters-bar">
        <nz-input-group [nzPrefix]="searchIcon">
          <input
            nz-input
            type="text"
            [placeholder]="'ADMIN.TRANSLATIONS.SEARCH_PLACEHOLDER' | translate"
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
          <span>{{ 'ADMIN.TRANSLATIONS.FILTERS.BUTTON' | translate }}</span>
        </button>
      </div>

      <nz-modal
        [(nzVisible)]="isFiltersModalOpen"
        (nzOnCancel)="closeFiltersModal()"
        [nzTitle]="'ADMIN.TRANSLATIONS.FILTERS.MODAL_TITLE' | translate"
        [nzWidth]="'min(560px, 92vw)'"
        nzCentered
      >
        <ng-container *nzModalContent>
          <div class="translation-filters__modal-grid">
            <nz-select
              class="translation-filters__select"
              [nzPlaceHolder]="'ADMIN.TRANSLATIONS.FILTERS.PUBLISHER' | translate"
              nzSize="default"
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

            <nz-select
              class="translation-filters__select"
              [nzPlaceHolder]="'ADMIN.TRANSLATIONS.FILTERS.LICENSE' | translate"
              nzSize="default"
              nzAllowClear
              [ngModel]="selectedLicense"
              (ngModelChange)="onLicenseChange($event)"
            >
              @for (l of licenseOptions; track l) {
                <nz-option [nzValue]="l" [nzLabel]="l"></nz-option>
              }
            </nz-select>

            <nz-select
              class="translation-filters__select"
              [nzPlaceHolder]="'ADMIN.TRANSLATIONS.FILTERS.LANGUAGE' | translate"
              nzSize="default"
              nzAllowClear
              [ngModel]="selectedLanguage"
              (ngModelChange)="onLanguageChange($event)"
            >
              <nz-option nzValue="ar" [nzLabel]="languageLabel('ar')"></nz-option>
              <nz-option nzValue="en" [nzLabel]="languageLabel('en')"></nz-option>
            </nz-select>

            <nz-select
              class="translation-filters__select"
              [nzPlaceHolder]="'ADMIN.TRANSLATIONS.FILTERS.IS_EXTERNAL' | translate"
              nzSize="default"
              nzAllowClear
              [ngModel]="selectedExternal"
              (ngModelChange)="onExternalChange($event)"
            >
              <nz-option
                [nzValue]="true"
                [nzLabel]="'ADMIN.TRANSLATIONS.FILTERS.TYPE_EXTERNAL' | translate"
              ></nz-option>
              <nz-option
                [nzValue]="false"
                [nzLabel]="'ADMIN.TRANSLATIONS.FILTERS.TYPE_INTERNAL' | translate"
              ></nz-option>
            </nz-select>
          </div>
        </ng-container>
        <ng-container *nzModalFooter>
          <div class="translation-filters__modal-footer">
            <button nz-button nzType="default" nzSize="default" (click)="clearAdvancedFilters()">
              {{ 'ADMIN.TRANSLATIONS.FILTERS.CLEAR' | translate }}
            </button>
            <button nz-button nzType="primary" nzSize="default" (click)="closeFiltersModal()">
              {{ 'ADMIN.TRANSLATIONS.FILTERS.DONE' | translate }}
            </button>
          </div>
        </ng-container>
      </nz-modal>
    </div>
  `,
  styleUrl: './translation-filters.component.less',
})
export class TranslationFiltersComponent implements OnInit {
  @Output() filtersChange = new EventEmitter<Partial<TranslationFilters>>();
  initialFilters = input<Partial<TranslationFilters>>({});

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
  isFiltersModalOpen = false;

  private currentFilters: Partial<TranslationFilters> = {};

  constructor() {
    effect(() => {
      const f = this.initialFilters();
      untracked(() => {
        this.hydrateFromFilters(f || {});
      });
    });
  }

  private hydrateFromFilters(f: Partial<TranslationFilters>): void {
    this.currentFilters = { ...f };
    this.searchValue = f.search || '';
    this.selectedPublisher = f.publisher_id != null ? Number(f.publisher_id) : null;
    this.selectedLicense = f.license_code ?? null;
    this.selectedLanguage = f.language ?? null;
    if (String(f.is_external) === 'true') this.selectedExternal = true;
    else if (String(f.is_external) === 'false') this.selectedExternal = false;
    else this.selectedExternal = null;
  }

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

  openFiltersModal(): void {
    this.isFiltersModalOpen = true;
  }

  closeFiltersModal(): void {
    this.isFiltersModalOpen = false;
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

  clearAdvancedFilters(): void {
    this.selectedPublisher = null;
    this.selectedLicense = null;
    this.selectedLanguage = null;
    this.selectedExternal = null;
    this.currentFilters = {
      ...this.currentFilters,
      publisher_id: undefined,
      license_code: undefined,
      language: undefined,
      is_external: undefined,
    };
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
