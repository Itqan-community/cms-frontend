import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { catchError, firstValueFrom, of } from 'rxjs';
import { Publisher } from '../../models/publishers-stats.models';
import { PublishersService } from '../../services/publishers.service';
import { PublisherEditComponent } from '../publisher-edit/publisher-edit.component';

@Component({
  selector: 'app-publisher-details',
  standalone: true,
  imports: [
    NzCardModule,
    NzButtonModule,
    NzDescriptionsModule,
    NzAvatarModule,
    NzTagModule,
    NzSpinModule,
    PublisherEditComponent,
  ],
  templateUrl: './publisher-details.component.html',
  styleUrl: './publisher-details.component.less',
})
export class PublisherDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly publishersService = inject(PublishersService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);

  protected publisherId = '';
  protected publisher: Publisher | null = null;
  protected loading = true;
  protected submitting = false;
  protected loadError = false;
  protected isEditing = false;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.loading = false;
        this.loadError = true;
        return;
      }

      this.publisherId = id;
      this.fetchPublisher();
    });
  }

  protected startEdit(): void {
    this.isEditing = true;
  }

  protected cancelEdit(): void {
    this.isEditing = false;
  }

  protected confirmUpdate(payload: Partial<Publisher>): void {
    this.modal.confirm({
      nzTitle: 'تأكيد التعديل',
      nzContent: 'سيتم تعديل بيانات هذا الناشر على مستوى النظام. هل تريد المتابعة؟',
      nzOkText: 'نعم، حفظ',
      nzCancelText: 'إلغاء',
      nzDirection: 'rtl',
      nzOnOk: () => this.updatePublisher(payload),
    });
  }

  protected showDeleteConfirm(): void {
    this.modal.confirm({
      nzTitle: 'تأكيد الحذف',
      nzContent: '<b>هذا الإجراء لا يمكن التراجع عنه.</b>',
      nzIconType: 'close-circle',
      nzOkText: 'نعم، احذف',
      nzCancelText: 'إلغاء',
      nzOkDanger: true,
      nzDirection: 'rtl',
      nzOnOk: () => this.deletePublisher(),
    });
  }

  protected reload(): void {
    this.fetchPublisher();
  }

  private fetchPublisher(): void {
    this.loading = true;
    this.loadError = false;

    this.publishersService
      .getPublisherById(this.publisherId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => {
          this.loading = false;
          this.loadError = true;
          this.message.error('تعذر تحميل تفاصيل الناشر');
          return of(null);
        })
      )
      .subscribe((publisher) => {
        if (!publisher) {
          return;
        }

        this.publisher = publisher;
        this.isEditing = false;
        this.loading = false;
      });
  }

  private async updatePublisher(payload: Partial<Publisher>): Promise<void> {
    this.submitting = true;

    try {
      const updatedPublisher = await firstValueFrom(
        this.publishersService.updatePublisher(this.publisherId, payload)
      );

      this.publisher = updatedPublisher;
      this.isEditing = false;
      this.message.success('تم تحديث بيانات الناشر بنجاح');
    } catch {
      this.message.error('تعذر تحديث بيانات الناشر');
    } finally {
      this.submitting = false;
    }
  }

  private async deletePublisher(): Promise<void> {
    try {
      await firstValueFrom(this.publishersService.deletePublisher(this.publisherId));
      this.message.success('تم حذف الناشر بنجاح');
      await this.router.navigate(['/quranic-cms/publishers']);
    } catch {
      this.message.error('تعذر حذف الناشر');
    }
  }
}
