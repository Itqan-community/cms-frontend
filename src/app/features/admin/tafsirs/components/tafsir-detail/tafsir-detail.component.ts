import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { LicensesColors } from '../../../../../core/enums/licenses.enum';
import { localizeLanguageCode } from '../../../utils/display-localization.util';
import { AssetVersionsManagerComponent } from '../../../components/asset-versions-manager/asset-versions-manager.component';
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
    NgIcon,
    NzSkeletonModule,
    NzTagModule,
    NzToolTipModule,
    TranslateModule,
    AssetVersionsManagerComponent,
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
  private readonly translate = inject(TranslateService);

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
        this.loading.set(false);
      },
    });
  }

  onEdit(): void {
    void this.router.navigate(['/admin/tafsirs', this.slug, 'edit']);
  }

  onDelete(): void {
    const name = this.tafsir()?.name_ar ?? this.translate.instant('ADMIN.TAFSIRS.TITLE');
    const dir = this.translate.currentLang === 'ar' ? 'rtl' : 'ltr';
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.TAFSIRS.DELETE.CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.TAFSIRS.DELETE.CONFIRM_BODY', { name }),
      nzOkText: this.translate.instant('ADMIN.TAFSIRS.DELETE.OK'),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.TAFSIRS.DELETE.CANCEL'),
      nzDirection: dir,
      nzOnOk: () =>
        this.tafsirsService.delete(this.slug).subscribe({
          next: () => {
            this.message.success(this.translate.instant('ADMIN.TAFSIRS.MESSAGES.DELETE_SUCCESS'));
            void this.router.navigate(['/admin/tafsirs']);
          },
        }),
    });
  }

  getLicenseColor(license: string): string {
    return this.licensesColors[license as keyof typeof LicensesColors] ?? '#8c8c8c';
  }

  languageLabel(code: string | null | undefined): string {
    return localizeLanguageCode(code, this.translate.currentLang);
  }
}
