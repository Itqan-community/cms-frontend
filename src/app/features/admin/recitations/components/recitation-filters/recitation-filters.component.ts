import { Component, DestroyRef, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { Subject, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { Licenses } from '../../../../../core/enums/licenses.enum';
import { ReciterListItem } from '../../../reciters/models/reciters.models';
import { RecitersAdminService } from '../../../reciters/services/reciters.service';
import { PublisherFilterItem } from '../../../tafsirs/models/tafsirs.models';
import { PublishersFilterService } from '../../../tafsirs/services/publishers-filter.service';
import {
  MaddLevel,
  MeemBehavior,
  NamedId,
  RecitationListFilters,
} from '../../models/recitations.models';
import { RecitationsService } from '../../services/recitations.service';

@Component({
  selector: 'app-recitation-filters',
  standalone: true,
  imports: [
    FormsModule,
    NzInputModule,
    NzSelectModule,
    NzDatePickerModule,
    NzButtonModule,
    NzModalModule,
    NgIcon,
  ],
  template: `
    <div class="recitation-filters" dir="rtl">
      <div class="recitation-filters__actions">
        <nz-input-group [nzPrefix]="searchIcon" class="recitation-filters__search">
          <input
            nz-input
            nzSize="default"
            type="text"
            placeholder="ابحث عن تلاوة..."
            [ngModel]="searchValue"
            (ngModelChange)="onSearchChange($event)"
          />
        </nz-input-group>
        <ng-template #searchIcon><ng-icon name="lucideSearch" /></ng-template>

        <button
          nz-button
          nzType="default"
          nzSize="default"
          class="recitation-filters__filters-btn"
          (click)="openFiltersModal()"
        >
          <ng-icon name="lucideFilter" />
          <span>الفلاتر</span>
        </button>
      </div>

      <nz-modal
        [(nzVisible)]="isFiltersModalOpen"
        (nzOnCancel)="closeFiltersModal()"
        nzTitle="فلاتر التلاوات"
        [nzWidth]="'min(760px, 94vw)'"
        nzCentered
      >
        <ng-container *nzModalContent>
          <div class="recitation-filters__modal-grid">
            <nz-select
              class="recitation-filters__select"
              nzPlaceHolder="الناشر"
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
              class="recitation-filters__select"
              nzPlaceHolder="القارئ"
              nzSize="default"
              nzAllowClear
              nzShowSearch
              [ngModel]="selectedReciter"
              (ngModelChange)="onReciterChange($event)"
            >
              @for (r of reciterOptions(); track r.id) {
                <nz-option [nzValue]="r.id" [nzLabel]="r.name"></nz-option>
              }
            </nz-select>

            <nz-select
              class="recitation-filters__select"
              nzPlaceHolder="القراءة"
              nzSize="default"
              nzAllowClear
              [ngModel]="selectedQiraah"
              (ngModelChange)="onQiraahChange($event)"
            >
              @for (q of qiraahOptions(); track q.id) {
                <nz-option [nzValue]="q.id" [nzLabel]="q.name"></nz-option>
              }
            </nz-select>

            <nz-select
              class="recitation-filters__select"
              nzPlaceHolder="الرواية"
              nzSize="default"
              nzAllowClear
              [nzLoading]="riwayahsLoading()"
              [ngModel]="selectedRiwayah"
              (ngModelChange)="onRiwayahChange($event)"
            >
              @for (rw of riwayahOptions(); track rw.id) {
                <nz-option [nzValue]="rw.id" [nzLabel]="rw.name"></nz-option>
              }
            </nz-select>

            <nz-select
              class="recitation-filters__select"
              nzPlaceHolder="مستوى المد"
              nzSize="default"
              nzAllowClear
              [ngModel]="selectedMadd"
              (ngModelChange)="onMaddChange($event)"
            >
              <nz-option [nzValue]="maddEnum.TWASSUT" nzLabel="توسّط"></nz-option>
              <nz-option [nzValue]="maddEnum.QASR" nzLabel="قصر"></nz-option>
            </nz-select>

            <nz-select
              class="recitation-filters__select"
              nzPlaceHolder="ميم الجمع"
              nzSize="default"
              nzAllowClear
              [ngModel]="selectedMeem"
              (ngModelChange)="onMeemChange($event)"
            >
              <nz-option [nzValue]="meemEnum.SILAH" nzLabel="وصل"></nz-option>
              <nz-option [nzValue]="meemEnum.SKOUN" nzLabel="سكون"></nz-option>
            </nz-select>

            <nz-select
              class="recitation-filters__select"
              nzPlaceHolder="الترخيص"
              nzSize="default"
              nzAllowClear
              [ngModel]="selectedLicense"
              (ngModelChange)="onLicenseChange($event)"
            >
              @for (l of licenseOptions; track l) {
                <nz-option [nzValue]="l" [nzLabel]="l"></nz-option>
              }
            </nz-select>

            <nz-date-picker
              nzMode="year"
              nzFormat="yyyy"
              nzSize="default"
              [nzInputReadOnly]="true"
              [nzDefaultPickerValue]="hijriDefaultPickerDate"
              [nzDisabledDate]="disableNonHijriYears"
              class="recitation-filters__year"
              nzPlaceHolder="السنة (هجري)"
              [ngModel]="selectedHijriDate"
              (ngModelChange)="onYearChange($event)"
            ></nz-date-picker>
          </div>
        </ng-container>
        <ng-container *nzModalFooter>
          <div class="recitation-filters__modal-footer">
            <button nz-button nzType="default" nzSize="default" (click)="clearAdvancedFilters()">
              مسح الفلاتر
            </button>
            <button nz-button nzType="primary" nzSize="default" (click)="closeFiltersModal()">
              تم
            </button>
          </div>
        </ng-container>
      </nz-modal>
    </div>
  `,
  styleUrl: './recitation-filters.component.less',
})
export class RecitationFiltersComponent implements OnInit {
  @Output() filtersChange = new EventEmitter<Partial<RecitationListFilters>>();

  private readonly publishersFilterService = inject(PublishersFilterService);
  private readonly recitersService = inject(RecitersAdminService);
  private readonly recitationsService = inject(RecitationsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchSubject = new Subject<string>();

  readonly maddEnum = MaddLevel;
  readonly meemEnum = MeemBehavior;
  readonly licenseOptions = Object.values(Licenses);

  readonly publisherOptions = signal<PublisherFilterItem[]>([]);
  readonly publishersLoading = signal(false);
  readonly reciterOptions = signal<ReciterListItem[]>([]);

  readonly qiraahOptions = signal<NamedId[]>([]);
  readonly riwayahOptions = signal<NamedId[]>([]);
  readonly riwayahsLoading = signal(false);

  searchValue = '';
  selectedPublisher: number | null = null;
  selectedReciter: number | null = null;
  selectedQiraah: number | null = null;
  selectedRiwayah: number | null = null;
  selectedMadd: MaddLevel | null = null;
  selectedMeem: MeemBehavior | null = null;
  selectedLicense: string | null = null;
  selectedHijriDate: Date | null = null;
  isFiltersModalOpen = false;
  readonly hijriDefaultPickerDate = new Date(1446, 0, 1);
  private readonly minHijriYear = 1300;
  private readonly maxHijriYear = 1600;

  private currentFilters: Partial<RecitationListFilters> = {};

  ngOnInit(): void {
    this.loadPublishers();
    this.loadReciters();
    forkJoin({
      q: this.recitationsService.qiraahOptions(),
      r: this.recitationsService.riwayahOptions(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ q, r }) => {
          this.qiraahOptions.set(q);
          this.riwayahOptions.set(r);
        },
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

  onReciterChange(id: number | null): void {
    this.selectedReciter = id;
    this.currentFilters = { ...this.currentFilters, reciter_id: id ?? undefined };
    this.emit();
  }

  onQiraahChange(id: number | null): void {
    this.selectedQiraah = id;
    this.loadRiwayahs(id, this.selectedRiwayah);
    this.currentFilters = { ...this.currentFilters, qiraah_id: id ?? undefined };
    this.emit();
  }

  onRiwayahChange(id: number | null): void {
    this.selectedRiwayah = id;
    this.currentFilters = { ...this.currentFilters, riwayah_id: id ?? undefined };
    this.emit();
  }

  onMaddChange(v: MaddLevel | null): void {
    this.selectedMadd = v;
    this.currentFilters = { ...this.currentFilters, madd_level: v ?? undefined };
    this.emit();
  }

  onMeemChange(v: MeemBehavior | null): void {
    this.selectedMeem = v;
    this.currentFilters = { ...this.currentFilters, meem_behaviour: v ?? undefined };
    this.emit();
  }

  onLicenseChange(v: string | null): void {
    this.selectedLicense = v;
    this.currentFilters = { ...this.currentFilters, license_code: v ?? undefined };
    this.emit();
  }

  onYearChange(v: Date | null): void {
    this.selectedHijriDate = v;
    const n = v ? v.getFullYear() : null;
    this.currentFilters = {
      ...this.currentFilters,
      year: n != null && !Number.isNaN(n) && n > 0 ? n : undefined,
    };
    this.emit();
  }

  clearAdvancedFilters(): void {
    this.selectedPublisher = null;
    this.selectedReciter = null;
    this.selectedQiraah = null;
    this.selectedRiwayah = null;
    this.selectedMadd = null;
    this.selectedMeem = null;
    this.selectedLicense = null;
    this.selectedHijriDate = null;
    this.currentFilters = {
      ...this.currentFilters,
      publisher_id: undefined,
      reciter_id: undefined,
      qiraah_id: undefined,
      riwayah_id: undefined,
      madd_level: undefined,
      meem_behaviour: undefined,
      license_code: undefined,
      year: undefined,
    };
    this.emit();
  }

  disableNonHijriYears = (current: Date): boolean => {
    const year = current.getFullYear();
    return year < this.minHijriYear || year > this.maxHijriYear;
  };

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
        error: () => this.publishersLoading.set(false),
      });
  }

  private loadReciters(): void {
    this.recitersService
      .getList({ page: 1, page_size: 100 })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.reciterOptions.set(res.results),
      });
  }

  private loadRiwayahs(qiraahId: number | null, keepRiwayahId: number | null): void {
    this.riwayahsLoading.set(true);
    this.recitationsService
      .riwayahOptions(qiraahId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.riwayahOptions.set(res);
          const shouldKeep =
            keepRiwayahId != null && res.some((riwayah) => riwayah.id === keepRiwayahId);
          if (!shouldKeep && this.selectedRiwayah != null) {
            this.selectedRiwayah = null;
            this.currentFilters = { ...this.currentFilters, riwayah_id: undefined };
            this.emit();
          }
          this.riwayahsLoading.set(false);
        },
        error: () => {
          this.riwayahOptions.set([]);
          if (this.selectedRiwayah != null) {
            this.selectedRiwayah = null;
            this.currentFilters = { ...this.currentFilters, riwayah_id: undefined };
            this.emit();
          }
          this.riwayahsLoading.set(false);
        },
      });
  }

  private emit(): void {
    this.filtersChange.emit(this.currentFilters);
  }
}
