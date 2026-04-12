import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Licenses } from '../../../../../core/enums/licenses.enum';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NgIcon } from '@ng-icons/core';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { PublisherFilterItem } from '../../../tafsirs/models/tafsirs.models';
import { PublishersFilterService } from '../../../tafsirs/services/publishers-filter.service';
import { ReciterListItem } from '../../../reciters/models/reciters.models';
import { RecitersAdminService } from '../../../reciters/services/reciters.service';
import { MaddLevel, MeemBehavior, NamedId } from '../../models/recitations.models';
import { RecitationsService } from '../../services/recitations.service';

/** Hijri year optional: empty is valid; if set, must be within range */
function optionalHijriYearRange(minY: number, maxY: number) {
  return (control: AbstractControl): ValidationErrors | null => {
    const raw = control.value;
    if (raw === null || raw === undefined || raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return { yearInvalid: true };
    if (n < minY || n > maxY) return { yearRange: true };
    return null;
  };
}

@Component({
  selector: 'app-recitation-form',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    NzButtonModule,
    NzDatePickerModule,
    NzFormModule,
    NzGridModule,
    NgIcon,
    NzInputModule,
    NzSelectModule,
    NzSkeletonModule,
  ],
  templateUrl: './recitation-form.component.html',
  styleUrl: './recitation-form.component.less',
})
export class RecitationFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly recitationsService = inject(RecitationsService);
  private readonly publishersFilterService = inject(PublishersFilterService);
  private readonly recitersService = inject(RecitersAdminService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly isEditMode = signal(false);
  readonly loadingDetail = signal(false);
  readonly loadingOptions = signal(true);
  readonly submitting = signal(false);

  readonly publisherOptions = signal<PublisherFilterItem[]>([]);
  readonly publishersLoading = signal(false);
  readonly reciterOptions = signal<ReciterListItem[]>([]);
  readonly qiraahOptions = signal<NamedId[]>([]);
  readonly riwayahOptions = signal<NamedId[]>([]);
  readonly riwayahsLoading = signal(false);
  readonly selectedHijriDate = signal<Date | null>(null);
  readonly hijriDefaultPickerDate = new Date(1446, 0, 1);
  private readonly minHijriYear = 1300;
  private readonly maxHijriYear = 1600;

  readonly licenseOptions = Object.values(Licenses);
  readonly maddOptions = [
    { v: MaddLevel.TWASSUT, l: 'توسّط' },
    { v: MaddLevel.QASR, l: 'قصر' },
  ];
  readonly meemOptions = [
    { v: MeemBehavior.SILAH, l: 'وصل (صلّة)' },
    { v: MeemBehavior.SKOUN, l: 'سكون' },
  ];

  readonly form = this.fb.group({
    name_ar: ['', [Validators.required, Validators.minLength(2)]],
    name_en: [''],
    description_ar: ['', [Validators.required]],
    description_en: ['', [Validators.required]],
    publisher_id: [null as number | null, [Validators.required]],
    reciter_id: [null as number | null, [Validators.required]],
    qiraah_id: [null as number | null, [Validators.required]],
    riwayah_id: [null as number | null],
    madd_level: [null as MaddLevel | null],
    meem_behaviour: [null as MeemBehavior | null],
    year: [null as number | null, [optionalHijriYearRange(1300, 1600)]],
    license: ['', [Validators.required]],
  });

  private editSlug: string | null = null;

  ngOnInit(): void {
    forkJoin({
      q: this.recitationsService.qiraahOptions(),
      r: this.recitationsService.riwayahOptions(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ q, r }) => {
          this.qiraahOptions.set(q);
          this.riwayahOptions.set(r);
          this.loadingOptions.set(false);
        },
        error: () => this.loadingOptions.set(false),
      });

    this.loadReciters();
    this.loadPublishers();

    const slugParam = this.route.snapshot.params['slug'];
    if (slugParam) {
      this.isEditMode.set(true);
      this.editSlug = slugParam;
      this.loadForEdit();
    }
  }

  onPublisherSearch(query: string): void {
    this.loadPublishers(query);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    const v = this.form.value;
    const body = {
      name_ar: v.name_ar ?? '',
      name_en: v.name_en ?? '',
      description_ar: v.description_ar ?? '',
      description_en: v.description_en ?? '',
      publisher_id: v.publisher_id as number,
      reciter_id: v.reciter_id as number,
      qiraah_id: v.qiraah_id as number,
      riwayah_id: v.riwayah_id ?? null,
      madd_level: v.madd_level ?? null,
      meem_behaviour: v.meem_behaviour ?? null,
      year: v.year ?? null,
      license: v.license ?? '',
    };

    this.submitting.set(true);
    const request$ =
      this.isEditMode() && this.editSlug != null
        ? this.recitationsService.patch(this.editSlug, body)
        : this.recitationsService.create(body);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.message.success(
          this.isEditMode() ? 'تم تحديث التلاوة بنجاح' : 'تم إضافة التلاوة بنجاح'
        );
        this.submitting.set(false);
        void this.router.navigate(['/admin/recitations', res.slug ?? String(res.id)]);
      },
      error: () => {
        this.submitting.set(false);
      },
    });
  }

  onYearChange(value: Date | null): void {
    this.selectedHijriDate.set(value);
    const year = value?.getFullYear() ?? null;
    this.form.patchValue({ year: year as number | null });
    this.form.controls.year.markAsDirty();
    this.form.controls.year.updateValueAndValidity({ onlySelf: true });
  }

  disableNonHijriYears = (current: Date): boolean => {
    const year = current.getFullYear();
    return year < this.minHijriYear || year > this.maxHijriYear;
  };

  onQiraahChange(qiraahId: number | null): void {
    const selectedRiwayahId = this.form.controls.riwayah_id.value;
    this.loadRiwayahs(qiraahId, selectedRiwayahId);
  }

  private loadForEdit(): void {
    if (this.editSlug == null) return;
    this.loadingDetail.set(true);
    this.recitationsService
      .getDetail(this.editSlug)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.form.patchValue({
            name_ar: data.name_ar,
            name_en: data.name_en,
            description_ar: data.description_ar,
            description_en: data.description_en,
            publisher_id: data.publisher.id,
            reciter_id: data.reciter.id,
            qiraah_id: data.qiraah.id,
            riwayah_id: data.riwayah?.id ?? null,
            madd_level: data.madd_level,
            meem_behaviour: data.meem_behaviour,
            year: data.year,
            license: data.license,
          });
          this.loadRiwayahs(data.qiraah.id, data.riwayah?.id ?? null);
          this.selectedHijriDate.set(
            data.year ? new Date(data.year, 0, 1) : this.hijriDefaultPickerDate
          );
          this.loadingDetail.set(false);
        },
        error: () => {
          this.loadingDetail.set(false);
        },
      });
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
          if (!shouldKeep) {
            this.form.controls.riwayah_id.patchValue(null);
          }
          this.riwayahsLoading.set(false);
        },
        error: () => {
          this.riwayahOptions.set([]);
          this.form.controls.riwayah_id.patchValue(null);
          this.riwayahsLoading.set(false);
        },
      });
  }
}
