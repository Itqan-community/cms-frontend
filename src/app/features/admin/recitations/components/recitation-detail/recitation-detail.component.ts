import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { LicensesColors } from '../../../../../core/enums/licenses.enum';
import { MaddLevel, MeemBehavior, RecitationDetails } from '../../models/recitations.models';
import { RecitationsService } from '../../services/recitations.service';

@Component({
  selector: 'app-recitation-detail',
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
  templateUrl: './recitation-detail.component.html',
  styleUrl: './recitation-detail.component.less',
})
export class RecitationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly recitationsService = inject(RecitationsService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);

  readonly recitation = signal<RecitationDetails | null>(null);
  readonly loading = signal(true);
  readonly licensesColors = LicensesColors;
  readonly maddLevel = MaddLevel;
  readonly meemBehavior = MeemBehavior;

  private id!: number;

  ngOnInit(): void {
    this.id = Number(this.route.snapshot.params['id']);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.recitationsService.getDetail(this.id).subscribe({
      next: (data) => {
        this.recitation.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.message.error('تعذر تحميل بيانات التلاوة.');
        this.loading.set(false);
      },
    });
  }

  onEdit(): void {
    void this.router.navigate(['/admin/recitations', this.id, 'edit']);
  }

  onDelete(): void {
    const name = this.recitation()?.name_ar ?? 'هذه التلاوة';
    this.modal.confirm({
      nzTitle: 'هل أنت متأكد من الحذف؟',
      nzContent: `<b>${name}</b> — هذا الإجراء لا يمكن التراجع عنه.`,
      nzOkText: 'نعم، احذف',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'إلغاء',
      nzDirection: 'rtl',
      nzOnOk: () =>
        this.recitationsService.delete(this.id).subscribe({
          next: () => {
            this.message.success('تم حذف التلاوة بنجاح');
            void this.router.navigate(['/admin/recitations']);
          },
          error: () => this.message.error('حدث خطأ أثناء الحذف'),
        }),
    });
  }

  getLicenseColor(license: string): string {
    return this.licensesColors[license as keyof typeof LicensesColors] ?? '#8c8c8c';
  }

  maddLabel(level: MaddLevel): string {
    return level === MaddLevel.TWASSUT ? 'توصّط' : 'قصر';
  }

  meemLabel(b: MeemBehavior): string {
    return b === MeemBehavior.SILAH ? 'وصل (صلّة)' : 'سكون';
  }
}
