import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NgIcon } from '@ng-icons/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ReciterDetails } from '../../models/reciters.models';
import { RecitersAdminService } from '../../services/reciters.service';
import { localizeCountryCodeOrName } from '../../../utils/display-localization.util';

@Component({
  selector: 'app-reciter-detail',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    NzModalModule,
    NzButtonModule,
    NgIcon,
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
  private readonly translate = inject(TranslateService);

  readonly reciter = signal<ReciterDetails | null>(null);
  readonly loading = signal(true);

  private slug!: string;

  ngOnInit(): void {
    this.slug = this.route.snapshot.params['slug'];
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.recitersService.getDetail(this.slug).subscribe({
      next: (data) => {
        this.reciter.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onEdit(): void {
    void this.router.navigate(['/admin/reciters', this.slug, 'edit']);
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
        this.recitersService.delete(this.slug).subscribe({
          next: () => {
            this.message.success('تم حذف القارئ بنجاح');
            void this.router.navigate(['/admin/reciters']);
          },
          error: () => {},
        }),
    });
  }

  countryLabel(country: string | null | undefined): string {
    return localizeCountryCodeOrName(country, this.translate.currentLang);
  }
}
