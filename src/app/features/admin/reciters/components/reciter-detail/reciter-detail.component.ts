import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ReciterDetails } from '../../models/reciters.models';
import { RecitersAdminService } from '../../services/reciters.service';

@Component({
  selector: 'app-reciter-detail',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    NzModalModule,
    NzButtonModule,
    NzIconModule,
    NzSkeletonModule,
    NzTagModule,
  ],
  templateUrl: './reciter-detail.component.html',
  styleUrl: './reciter-detail.component.less',
})
export class ReciterDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recitersService = inject(RecitersAdminService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);

  readonly reciter = signal<ReciterDetails | null>(null);
  readonly loading = signal(true);

  private id!: number;

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.params['id']);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.recitersService.getDetail(this.id).subscribe({
      next: (data) => {
        this.reciter.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.message.error('تعذر تحميل بيانات القارئ.');
        this.loading.set(false);
      },
    });
  }

  onEdit(): void {
    void this.router.navigate(['/admin/reciters', this.id, 'edit']);
  }

  onDelete(): void {
    const name = this.reciter()?.name_ar ?? 'هذا القارئ';
    this.modal.confirm({
      nzTitle: 'هل أنت متأكد من الحذف؟',
      nzContent: `<b>${name}</b> — هذا الإجراء لا يمكن التراجع عنه.`,
      nzOkText: 'نعم، احذف',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'إلغاء',
      nzDirection: 'rtl',
      nzOnOk: () =>
        this.recitersService.delete(this.id).subscribe({
          next: () => {
            this.message.success('تم حذف القارئ بنجاح');
            void this.router.navigate(['/admin/reciters']);
          },
          error: () => this.message.error('حدث خطأ أثناء الحذف'),
        }),
    });
  }
}
