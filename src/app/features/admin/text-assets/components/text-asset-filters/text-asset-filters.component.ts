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
import { PublishersFilterService } from '../../services/publishers-filter.service';
import { AssetTagsService } from '../../services/asset-tags.service';
import { AssetTag, PublisherFilterItem, TextAssetFilters } from '../../models/text-assets.models';
import {
  createDisplayLocalizationLabels,
  localizeLanguageCode,
} from '../../../utils/display-localization.util';

@Component({
  selector: 'app-text-asset-filters',
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
    <div class="text-asset-filters">
      <div class="admin-filters-bar">
        <nz-input-group [nzPrefix]="searchIcon">
          <input
            nz-input
            type="text"
            [placeholder]="'ADMIN.TEXT_ASSETS.SEARCH_PLACEHOLDER' | translate"
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
          <span>{{ 'ADMIN.TEXT_ASSETS.FILTERS.BUTTON' | translate }}</span>
        </button>
      </div>

      <nz-modal
        [(nzVisible)]="isFiltersModalOpen"
        (nzOnCancel)="closeFiltersModal()"
        [nzTitle]="'ADMIN.TEXT_ASSETS.FILTERS.MODAL_TITLE' | translate"
        [nzWidth]="'min(560px, 92vw)'"
        nzCentered
      >
        <ng-container *nzModalContent>
          <div class="text-asset-filters__modal-grid">
            <nz-select
              class="text-asset-filters__select"
              [nzPlaceHolder]="'ADMIN.TEXT_ASSETS.FILTERS.PUBLISHER' | translate"
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
              class="text-asset-filters__select"
              [nzPlaceHolder]="'ADMIN.TEXT_ASSETS.FILTERS.LICENSE' | translate"
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
              class="text-asset-filters__select"
              [nzPlaceHolder]="'ADMIN.TEXT_ASSETS.FILTERS.TAG' | translate"
              nzSize="default"
              nzAllowClear
              [ngModel]="selectedTag"
              (ngModelChange)="onTagChange($event)"
            >
              @for (tag of tagOptions(); track tag.slug) {
                <nz-option [nzValue]="tag.slug" [nzLabel]="tag.name"></nz-option>
              }
            </nz-select>

            <nz-select
              class="text-asset-filters__select"
              [nzPlaceHolder]="'ADMIN.TEXT_ASSETS.FILTERS.LANGUAGE' | translate"
              nzSize="default"
              nzAllowClear
              [ngModel]="selectedLanguage"
              (ngModelChange)="onLanguageChange($event)"
            >
              <nz-option nzValue="ar" [nzLabel]="languageLabel('ar')"></nz-option>
              <nz-option nzValue="en" [nzLabel]="languageLabel('en')"></nz-option>
            </nz-select>

            <nz-select
              class="text-asset-filters__select"
              [nzPlaceHolder]="'ADMIN.COMMON.FILTER_OPEN_ACCESS' | translate"
              nzSize="default"
              nzAllowClear
              [ngModel]="selectedOpenAccess"
              (ngModelChange)="onOpenAccessChange($event)"
            >
              <nz-option
                [nzValue]="true"
                [nzLabel]="'ADMIN.COMMON.FILTER_OPEN_ACCESS_YES' | translate"
              ></nz-option>
              <nz-option
                [nzValue]="false"
                [nzLabel]="'ADMIN.COMMON.FILTER_OPEN_ACCESS_NO' | translate"
              ></nz-option>
            </nz-select>

            <nz-select
              class="text-asset-filters__select"
              [nzPlaceHolder]="'ADMIN.TEXT_ASSETS.FILTERS.IS_EXTERNAL' | translate"
              nzSize="default"
              nzAllowClear
              [ngModel]="selectedExternal"
              (ngModelChange)="onExternalChange($event)"
            >
              <nz-option
                [nzValue]="true"
                [nzLabel]="'ADMIN.TEXT_ASSETS.FILTERS.TYPE_EXTERNAL' | translate"
              ></nz-option>
              <nz-option
                [nzValue]="false"
                [nzLabel]="'ADMIN.TEXT_ASSETS.FILTERS.TYPE_INTERNAL' | translate"
              ></nz-option>
            </nz-select>
          </div>
        </ng-container>
        <ng-container *nzModalFooter>
          <div class="text-asset-filters__modal-footer">
            <button nz-button nzType="default" nzSize="default" (click)="clearAdvancedFilters()">
              {{ 'ADMIN.TEXT_ASSETS.FILTERS.CLEAR' | translate }}
            </button>
            <button nz-button nzType="primary" nzSize="default" (click)="closeFiltersModal()">
              {{ 'ADMIN.TEXT_ASSETS.FILTERS.DONE' | translate }}
            </button>
          </div>
        </ng-container>
      </nz-modal>
    </div>
  `,
  styleUrl: './text-asset-filters.component.less',
})
export class TextAssetFiltersComponent implements OnInit {
  @Output() filtersChange = new EventEmitter<Partial<TextAssetFilters>>();
  initialFilters = input<Partial<TextAssetFilters>>({});

  private readonly publishersFilterService = inject(PublishersFilterService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  readonly licenseOptions = Object.values(Licenses);
  private readonly assetTagsService = inject(AssetTagsService);
  readonly tagOptions = signal<AssetTag[]>([]);
  readonly publisherOptions = signal<PublisherFilterItem[]>([]);
  readonly publishersLoading = signal(false);

  searchValue = '';
  selectedPublisher: number | null = null;
  selectedLicense: string | null = null;
  selectedLanguage: 'ar' | 'en' | null = null;
  selectedTag: string | null = null;
  selectedExternal: boolean | null = null;
  selectedOpenAccess: boolean | null = null;
  isFiltersModalOpen = false;

  private currentFilters: Partial<TextAssetFilters> = {};

  constructor() {
    effect(() => {
      const f = this.initialFilters();
      untracked(() => {
        this.hydrateFromFilters(f || {});
      });
    });
  }

  private hydrateFromFilters(f: Partial<TextAssetFilters>): void {
    this.currentFilters = { ...f };
    this.searchValue = f.search || '';
    this.selectedPublisher = f.publisher_id != null ? Number(f.publisher_id) : null;
    this.selectedLicense = f.license_code ?? null;
    this.selectedLanguage = f.language ?? null;
    this.selectedTag = f.tag ?? null;
    if (String(f.is_external) === 'true') this.selectedExternal = true;
    else if (String(f.is_external) === 'false') this.selectedExternal = false;
    else this.selectedExternal = null;
    if (String(f.is_open_access) === 'true') this.selectedOpenAccess = true;
    else if (String(f.is_open_access) === 'false') this.selectedOpenAccess = false;
    else this.selectedOpenAccess = null;
  }

  ngOnInit(): void {
    this.loadPublishers();
    this.assetTagsService
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tags) => this.tagOptions.set(tags),
        error: () => this.tagOptions.set([]),
      });

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

  onTagChange(value: string | null): void {
    this.selectedTag = value;
    this.currentFilters = { ...this.currentFilters, tag: value ?? undefined };
    this.emit();
  }

  onExternalChange(value: boolean | null): void {
    this.selectedExternal = value;
    this.currentFilters = { ...this.currentFilters, is_external: value ?? undefined };
    this.emit();
  }

  onOpenAccessChange(value: boolean | null): void {
    this.selectedOpenAccess = value;
    this.currentFilters = { ...this.currentFilters, is_open_access: value ?? undefined };
    this.emit();
  }

  clearAdvancedFilters(): void {
    this.selectedPublisher = null;
    this.selectedLicense = null;
    this.selectedLanguage = null;
    this.selectedTag = null;
    this.selectedExternal = null;
    this.selectedOpenAccess = null;
    this.currentFilters = {
      ...this.currentFilters,
      publisher_id: undefined,
      license_code: undefined,
      language: undefined,
      tag: undefined,
      is_external: undefined,
      is_open_access: undefined,
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
    return localizeLanguageCode(
      code,
      this.translate.currentLang,
      createDisplayLocalizationLabels(this.translate)
    );
  }
}
