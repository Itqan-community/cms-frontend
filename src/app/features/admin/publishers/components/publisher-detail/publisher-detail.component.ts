import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { Publisher } from '../../models/publishers-stats.models';
import { PublishersService } from '../../services/publishers.service';

@Component({
  selector: 'app-publisher-detail',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    NzModalModule,
    NzButtonModule,
    NzIconModule,
    NzSkeletonModule,
    NzTagModule,
    NzAvatarModule,
    NzDescriptionsModule,
  ],
  templateUrl: './publisher-detail.component.html',
  styleUrl: './publisher-detail.component.less',
})
export class PublisherDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly publishersService = inject(PublishersService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);

  readonly publisher = signal<Publisher | null>(null);
  readonly loading = signal(true);

  private id!: number;

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.params['id']);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.publishersService.getDetail(this.id).subscribe({
      next: (data) => {
        this.publisher.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.message.error('تعذر تحميل بيانات الناشر.');
        this.loading.set(false);
      },
    });
  }

  onEdit(): void {
    void this.router.navigate(['/admin/publishers', this.id, 'edit']);
  }

  onDelete(): void {
    const name = this.publisher()?.name_ar ?? this.publisher()?.name_en ?? 'هذا الناشر';
    this.modal.confirm({
      nzTitle: 'تأكيد الحذف (Confirm Deletion)',
      nzContent: `<b>${name}</b> — هذا الإجراء لا يمكن التراجع عنه.`,
      nzOkText: 'نعم، احذف',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'إلغاء',
      nzDirection: 'rtl',
      nzOnOk: () =>
        this.publishersService.deletePublisher(this.id).subscribe({
          next: () => {
            this.message.success('تم حذف الناشر بنجاح');
            void this.router.navigate(['/admin/publishers']);
          },
          error: () => this.message.error('حدث خطأ أثناء الحذف'),
        }),
    });
  }
}
