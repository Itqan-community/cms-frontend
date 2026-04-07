import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NgIcon } from '@ng-icons/core';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { Publisher, PublisherUpdatePayload } from '../../models/publishers-stats.models';
import { PublishersService } from '../../services/publishers.service';

@Component({
  selector: 'app-publisher-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NzModalModule,
    NzButtonModule,
    NzFormModule,
    NzGridModule,
    NgIcon,
    NzInputModule,
    NzSkeletonModule,
    NzSwitchModule,
  ],
  templateUrl: './publisher-form.component.html',
  styleUrl: './publisher-form.component.less',
})
export class PublisherFormComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly publishersService = inject(PublishersService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);

  readonly isEditMode = signal(false);
  readonly loadingDetail = signal(false);
  readonly submitting = signal(false);

  readonly form = this.fb.group({
    name_ar: ['', [Validators.required, Validators.minLength(2)]],
    name_en: ['', [Validators.required, Validators.minLength(2)]],
    country: [''],
    website: [''],
    icon_url: [''],
    foundation_year: [null as number | null],
    address: [''],
    contact_email: ['', [Validators.email]],
    description: [''],
    is_verified: [false],
  });

  private editId: number | null = null;

  ngOnInit(): void {
    const idParam = this.route.snapshot.params['id'];
    if (idParam) {
      this.isEditMode.set(true);
      this.editId = Number(idParam);
      this.loadForEdit();
    }
  }

  onCancel(): void {
    if (this.isEditMode() && this.editId != null) {
      void this.router.navigate(['/admin/publishers', this.editId]);
    } else {
      void this.router.navigate(['/admin/publishers']);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      Object.values(this.form.controls).forEach((c) => {
        c.markAsDirty();
        c.updateValueAndValidity({ onlySelf: true });
      });
      return;
    }

    if (this.isEditMode() && this.editId != null) {
      this.modal.confirm({
        nzTitle: 'تأكيد تعديل الناشر',
        nzContent: 'هل تؤكد حفظ التغييرات؟ سيتم تحديث بيانات الناشر على مستوى النظام.',
        nzOkText: 'نعم، احفظ',
        nzCancelText: 'إلغاء',
        nzDirection: 'rtl',
        nzOnOk: () => this.persistEdit(),
      });
      return;
    }

    void this.persistCreate();
  }

  private async persistEdit(): Promise<void> {
    const id = this.editId;
    if (id == null) return;

    const payload = this.buildPayload();
    this.submitting.set(true);
    try {
      await firstValueFrom(this.publishersService.updatePublisher(id, payload));
      this.message.success('تم تحديث الناشر بنجاح');
      void this.router.navigate(['/admin/publishers', id]);
    } catch {
      this.message.error('حدث خطأ. يرجى المحاولة مرة أخرى.');
      return Promise.reject(new Error('save failed'));
    } finally {
      this.submitting.set(false);
    }
  }

  private async persistCreate(): Promise<void> {
    const payload = this.buildPayload();
    this.submitting.set(true);
    try {
      const created = await firstValueFrom(
        this.publishersService.createPublisher(payload as Partial<Publisher>)
      );
      this.message.success('تم إضافة الناشر بنجاح');
      void this.router.navigate(['/admin/publishers', created.id]);
    } catch {
      this.message.error('حدث خطأ. يرجى المحاولة مرة أخرى.');
    } finally {
      this.submitting.set(false);
    }
  }

  private buildPayload(): PublisherUpdatePayload {
    const v = this.form.getRawValue();
    const fy = v.foundation_year;
    return {
      name_ar: (v.name_ar ?? '').trim(),
      name_en: (v.name_en ?? '').trim(),
      country: v.country?.trim() || undefined,
      website: v.website?.trim() || undefined,
      icon_url: v.icon_url?.trim() || undefined,
      foundation_year:
        fy != null && fy !== ('' as unknown as number) && !Number.isNaN(Number(fy))
          ? Number(fy)
          : undefined,
      address: v.address?.trim() || undefined,
      contact_email: v.contact_email?.trim() || undefined,
      description: v.description?.trim() || undefined,
      is_verified: !!v.is_verified,
    };
  }

  private loadForEdit(): void {
    if (this.editId == null) return;
    this.loadingDetail.set(true);
    this.publishersService.getDetail(this.editId).subscribe({
        next: (data) => {
          this.form.patchValue({
            name_ar: data.name_ar,
            name_en: data.name_en,
            country: data.country ?? '',
            website: data.website ?? '',
            icon_url: data.icon_url ?? '',
            foundation_year: data.foundation_year ?? null,
            address: data.address ?? '',
            contact_email: data.contact_email ?? '',
            description: data.description ?? '',
            is_verified: !!data.is_verified,
          });
          this.loadingDetail.set(false);
        },
        error: () => {
          this.message.error('تعذر تحميل بيانات الناشر للتعديل.');
          this.loadingDetail.set(false);
        },
      });
  }
}
