import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { PublisherEditComponent } from '../publisher-edit/publisher-edit.component';
import { CmsPublisher, CmsPublishersService } from '../../services/publishers.service';

@Component({
  selector: 'app-publisher-details',
  standalone: true,
  imports: [RouterLink, NzSpinModule, NzTagModule, NzModalModule, PublisherEditComponent],
  templateUrl: './publisher-details.component.html',
  styleUrl: './publisher-details.component.less',
})
export class PublisherDetailsComponent implements OnInit {
  private readonly service = inject(CmsPublishersService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);

  readonly id = this.route.snapshot.params['id'] as string;
  publisher = signal<CmsPublisher | null>(null);
  loading = signal(true);
  isEditing = signal(false);

  ngOnInit(): void {
    this.loadPublisher();
  }

  private loadPublisher(): void {
    this.loading.set(true);
    this.service.getPublisher(this.id).subscribe({
      next: (pub) => this.publisher.set(pub),
      error: () => {
        this.message.error('تعذر تحميل بيانات الناشر');
        this.loading.set(false);
      },
      complete: () => this.loading.set(false),
    });
  }

  goBack(): void {
    this.location.back();
  }

  startEdit(): void {
    this.isEditing.set(true);
  }

  cancelEdit(): void {
    this.isEditing.set(false);
  }

  onSave(data: Partial<CmsPublisher>): void {
    this.modal.confirm({
      nzTitle: 'تأكيد تعديل الناشر',
      nzContent:
        'هل أنت متأكد من تعديل بيانات هذا الناشر؟ سيتم تطبيق التغييرات على المنظومة بالكامل.',
      nzOkText: 'نعم، احفظ',
      nzCancelText: 'إلغاء',
      nzDirection: 'rtl',
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.service.updatePublisher(this.id, data).subscribe({
            next: (updated) => {
              this.publisher.set(updated);
              this.isEditing.set(false);
              this.message.success('تم تحديث بيانات الناشر بنجاح');
              resolve();
            },
            error: () => {
              this.message.error('تعذر تحديث بيانات الناشر');
              reject();
            },
          });
        }),
    });
  }

  onDelete(): void {
    const name = this.publisher()?.name_ar ?? '';
    this.modal.confirm({
      nzTitle: 'تأكيد الحذف',
      nzContent: `هل أنت متأكد من حذف الناشر "${name}"؟ هذه العملية لا يمكن التراجع عنها.`,
      nzOkText: 'نعم، احذف',
      nzOkDanger: true,
      nzOkType: 'primary',
      nzCancelText: 'إلغاء',
      nzDirection: 'rtl',
      nzOnOk: () =>
        new Promise<void>((resolve, reject) => {
          this.service.deletePublisher(this.id).subscribe({
            next: () => {
              this.message.success('تم حذف الناشر بنجاح');
              this.router.navigate(['/quranic-cms']);
              resolve();
            },
            error: () => {
              this.message.error('تعذر حذف الناشر');
              reject();
            },
          });
        }),
    });
  }

  publisherIcon(): string {
    const types = this.publisher()?.content_types ?? [];
    const hasAudio = types.some((t) => ['recitations', 'audio_mushaf', 'adhan'].includes(t));
    const hasText = types.some((t) => ['text_mushaf', 'tafseer', 'translations'].includes(t));
    if (hasAudio && hasText) return '📋';
    if (hasAudio) return '🎵';
    if (hasText) return '📄';
    return '📰';
  }

  contentTypeLabel(value: string): string {
    const map: Record<string, string> = {
      recitations: 'تلاوات',
      audio_mushaf: 'مصاحف صوتية',
      text_mushaf: 'مصاحف نصية',
      tafseer: 'تفاسير',
      translations: 'ترجمات',
      adhan: 'أذان',
    };
    return map[value] ?? value;
  }
}
