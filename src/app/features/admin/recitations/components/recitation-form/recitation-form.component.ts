import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Licenses } from '../../../../../core/enums/licenses.enum';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { PublisherFilterItem } from '../../../tafsirs/models/tafsirs.models';
import { PublishersFilterService } from '../../../tafsirs/services/publishers-filter.service';
import { ReciterListItem } from '../../../reciters/models/reciters.models';
import { RecitersAdminService } from '../../../reciters/services/reciters.service';
import { MaddLevel, MeemBehavior, NamedId } from '../../models/recitations.models';
import { RecitationsService } from '../../services/recitations.service';

@Component({
  selector: 'app-recitation-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NzButtonModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
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

  readonly licenseOptions = Object.values(Licenses);
  readonly maddOptions = [
    { v: MaddLevel.TWASSUT, l: 'توصّط' },
    { v: MaddLevel.QASR, l: 'قصر' },
  ];
  readonly meemOptions = [
    { v: MeemBehavior.SILAH, l: 'وصل (صلّة)' },
    { v: MeemBehavior.SKOUN, l: 'سكون' },
  ];

  readonly form = this.fb.group({
    name_ar: ['', [Validators.required, Validators.minLength(2)]],
    name_en: ['', [Validators.required, Validators.minLength(2)]],
    description_ar: ['', [Validators.required]],
    description_en: ['', [Validators.required]],
    publisher_id: [null as number | null, [Validators.required]],
    reciter_id: [null as number | null, [Validators.required]],
    qiraah_id: [null as number | null, [Validators.required]],
    riwayah_id: [null as number | null, [Validators.required]],
    madd_level: [MaddLevel.TWASSUT, [Validators.required]],
    meem_behavior: [MeemBehavior.SILAH, [Validators.required]],
    year: [2024, [Validators.required, Validators.min(1900), Validators.max(2100)]],
    license: ['', [Validators.required]],
  });

  private editId: number | null = null;

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

    const idParam = this.route.snapshot.params['id'];
    if (idParam) {
      this.isEditMode.set(true);
      this.editId = Number(idParam);
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
      riwayah_id: v.riwayah_id as number,
      madd_level: v.madd_level as MaddLevel,
      meem_behavior: v.meem_behavior as MeemBehavior,
      year: v.year as number,
      license: v.license ?? '',
    };

    this.submitting.set(true);
    const request$ =
      this.isEditMode() && this.editId != null
        ? this.recitationsService.patch(this.editId, body)
        : this.recitationsService.create(body);

    request$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (res) => {
        this.message.success(
          this.isEditMode() ? 'تم تحديث التلاوة بنجاح' : 'تم إضافة التلاوة بنجاح'
        );
        this.submitting.set(false);
        void this.router.navigate(['/admin/recitations', res.id]);
      },
      error: () => {
        this.message.error('حدث خطأ. يرجى المحاولة مرة أخرى.');
        this.submitting.set(false);
      },
    });
  }

  private loadForEdit(): void {
    if (this.editId == null) return;
    this.loadingDetail.set(true);
    this.recitationsService
      .getDetail(this.editId)
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
            riwayah_id: data.riwayah.id,
            madd_level: data.madd_level,
            meem_behavior: data.meem_behavior,
            year: data.year,
            license: data.license,
          });
          this.loadingDetail.set(false);
        },
        error: () => {
          this.message.error('تعذر تحميل بيانات التلاوة للتعديل.');
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
}
