import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { AssetVersionsManagerComponent } from '../../../components/asset-versions-manager/asset-versions-manager.component';
import { AdminAuthService } from '../../../services/admin-auth.service';
import {
  createDisplayLocalizationLabels,
  localizeLanguageCode,
} from '../../../utils/display-localization.util';
import { ProgramDetails } from '../../models/programs.models';
import { ProgramsService } from '../../services/programs.service';
import { canDeleteProgram, canUpdateProgram } from '../../utils/program-permissions.util';

@Component({
  selector: 'app-program-detail',
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
  templateUrl: './program-detail.component.html',
  styleUrl: './program-detail.component.less',
})
export class ProgramDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly programsService = inject(ProgramsService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly translate = inject(TranslateService);
  private readonly adminAuth = inject(AdminAuthService);

  readonly canUpdateProgram = computed(() => canUpdateProgram(this.adminAuth));
  readonly canDeleteProgram = computed(() => canDeleteProgram(this.adminAuth));

  readonly program = signal<ProgramDetails | null>(null);
  readonly loading = signal(true);
  readonly licensesColors = LicensesColors;

  private slug!: string;

  ngOnInit(): void {
    this.slug = this.route.snapshot.params['slug'];
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.programsService.getDetail(this.slug).subscribe({
      next: (data) => {
        this.program.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onEdit(): void {
    void this.router.navigate(['/admin/programs', this.slug, 'edit']);
  }

  onDelete(): void {
    const name = this.program()?.name_ar ?? this.translate.instant('ADMIN.PROGRAMS.TITLE');
    const dir = this.translate.currentLang === 'ar' ? 'rtl' : 'ltr';
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.PROGRAMS.DELETE.CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.PROGRAMS.DELETE.CONFIRM_BODY', { name }),
      nzOkText: this.translate.instant('ADMIN.PROGRAMS.DELETE.OK'),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.PROGRAMS.DELETE.CANCEL'),
      nzDirection: dir,
      nzOnOk: () =>
        this.programsService.delete(this.slug).subscribe({
          next: () => {
            this.message.success(this.translate.instant('ADMIN.PROGRAMS.MESSAGES.DELETE_SUCCESS'));
            void this.router.navigate(['/admin/programs']);
          },
        }),
    });
  }

  getLicenseColor(license: string): string {
    return this.licensesColors[license as keyof typeof LicensesColors] ?? '#8c8c8c';
  }

  languageLabel(code: string | null | undefined): string {
    return localizeLanguageCode(
      code,
      this.translate.currentLang,
      createDisplayLocalizationLabels(this.translate)
    );
  }
}
