import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { LicensesColors } from '../../../../../core/enums/licenses.enum';
import { TafsirDetails } from '../../models/tafsirs.models';
import { TafsirsService } from '../../services/tafsirs.service';

@Component({
  selector: 'app-tafsir-detail',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    NzModalModule,
    NzButtonModule,
    NzIconModule,
    NzSkeletonModule,
    NzTableModule,
    NzTagModule,
    NzToolTipModule,
  ],
  templateUrl: './tafsir-detail.component.html',
  styleUrl: './tafsir-detail.component.less',
})
export class TafsirDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly tafsirsService = inject(TafsirsService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);

  readonly tafsir = signal<TafsirDetails | null>(null);
  readonly loading = signal(true);
  readonly licensesColors = LicensesColors;

  private slug!: string;

  ngOnInit(): void {
    this.slug = this.route.snapshot.params['slug'];
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.tafsirsService.getDetail(this.slug).subscribe({
      next: (data) => {
        this.tafsir.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.message.error('تعذر تحميل بيانات التفسير.');
        this.loading.set(false);
      },
    });
  }

  onEdit(): void {
    void this.router.navigate(['/admin/tafsirs', this.slug, 'edit']);
  }

  onDelete(): void {
    const name = this.tafsir()?.name_ar ?? 'هذا التفسير';
    this.modal.confirm({
      nzTitle: 'هل أنت متأكد من الحذف؟',
      nzContent: `<b>${name}</b> — هذا الإجراء لا يمكن التراجع عنه.`,
      nzOkText: 'نعم، احذف',
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: 'إلغاء',
      nzDirection: 'rtl',
      nzOnOk: () =>
        this.tafsirsService.delete(this.slug).subscribe({
          next: () => {
            this.message.success('تم حذف التفسير بنجاح');
            void this.router.navigate(['/admin/tafsirs']);
          },
          error: () => this.message.error('حدث خطأ أثناء الحذف'),
        }),
    });
  }

  getLicenseColor(license: string): string {
    return this.licensesColors[license as keyof typeof LicensesColors] ?? '#8c8c8c';
  }

  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
