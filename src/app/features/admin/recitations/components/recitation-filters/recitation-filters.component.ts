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
import { Subject, debounceTime, distinctUntilChanged, forkJoin } from 'rxjs';
import { Licenses } from '../../../../../core/enums/licenses.enum';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NgIcon } from '@ng-icons/core';
import { PublishersFilterService } from '../../../tafsirs/services/publishers-filter.service';
import { PublisherFilterItem } from '../../../tafsirs/models/tafsirs.models';
import { RecitersAdminService } from '../../../reciters/services/reciters.service';
import { ReciterListItem } from '../../../reciters/models/reciters.models';
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
  imports: [FormsModule, NzInputModule, NzSelectModule, NgIcon],
  template: `
    <div class="recitation-filters" dir="rtl">
      <nz-input-group [nzPrefix]="searchIcon" class="recitation-filters__search">
        <input
          nz-input
          type="text"
          placeholder="ابحث عن تلاوة..."
          [ngModel]="searchValue"
          (ngModelChange)="onSearchChange($event)"
        />
      </nz-input-group>
      <ng-template #searchIcon><ng-icon name="lucideSearch" /></ng-template>

      <nz-select
        class="recitation-filters__select"
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

      <nz-select
        class="recitation-filters__select"
        nzPlaceHolder="القارئ"
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
        nzAllowClear
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
        nzAllowClear
        [ngModel]="selectedMadd"
        (ngModelChange)="onMaddChange($event)"
      >
        <nz-option [nzValue]="maddEnum.TWASSUT" nzLabel="توصّط"></nz-option>
        <nz-option [nzValue]="maddEnum.QASR" nzLabel="قصر"></nz-option>
      </nz-select>

      <nz-select
        class="recitation-filters__select"
        nzPlaceHolder="همز الميم"
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
        nzAllowClear
        [ngModel]="selectedLicense"
        (ngModelChange)="onLicenseChange($event)"
      >
        @for (l of licenseOptions; track l) {
          <nz-option [nzValue]="l" [nzLabel]="l"></nz-option>
        }
      </nz-select>

      <input
        nz-input
        type="number"
        class="recitation-filters__year"
        placeholder="السنة"
        [ngModel]="yearValue"
        (ngModelChange)="onYearChange($event)"
      />
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

  searchValue = '';
  selectedPublisher: number | null = null;
  selectedReciter: number | null = null;
  selectedQiraah: number | null = null;
  selectedRiwayah: number | null = null;
  selectedMadd: MaddLevel | null = null;
  selectedMeem: MeemBehavior | null = null;
  selectedLicense: string | null = null;
  yearValue: number | null = null;

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
    this.currentFilters = { ...this.currentFilters, meem_behavior: v ?? undefined };
    this.emit();
  }

  onLicenseChange(v: string | null): void {
    this.selectedLicense = v;
    this.currentFilters = { ...this.currentFilters, license: v ?? undefined };
    this.emit();
  }

  onYearChange(v: string | number | null): void {
    const n = v === '' || v == null ? null : Number(v);
    this.yearValue = n;
    this.currentFilters = {
      ...this.currentFilters,
      year: n != null && !Number.isNaN(n) && n > 0 ? n : undefined,
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

  private emit(): void {
    this.filtersChange.emit(this.currentFilters);
  }
}
