import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { AdminTenantService } from '../../../services/admin-tenant.service';
import { PORTAL_PERMISSIONS } from '../../../constants/portal-permission.constants';
import {
  resolvePublisherDetailRecoveryId,
  buildSelectedPublisherDetailCommands,
} from '../../../utils/admin-tenant-navigation.util';
import {
  createDisplayLocalizationLabels,
  localizeCountryCodeOrName,
} from '../../../utils/display-localization.util';
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
    NgIcon,
    NzSkeletonModule,
    NzTagModule,
    NzAvatarModule,
    NzDescriptionsModule,
    TranslateModule,
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
  private readonly translate = inject(TranslateService);
  private readonly adminAuth = inject(AdminAuthService);
  private readonly tenantService = inject(AdminTenantService);

  readonly canCreatePublisher = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_CREATE_PUBLISHER)
  );
  readonly canEditPublisher = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_UPDATE_PUBLISHER)
  );
  readonly canDeletePublisher = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_DELETE_PUBLISHER)
  );

  readonly publisher = signal<Publisher | null>(null);
  readonly loading = signal(true);
  readonly publishersHomeLink = computed(() =>
    buildSelectedPublisherDetailCommands(this.tenantService.getSelectedPublisherId())
  );

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
        this.loading.set(false);
        this.tryRecoverFromLoadError();
      },
    });
  }

  private tryRecoverFromLoadError(): void {
    const recoveryId = resolvePublisherDetailRecoveryId(
      this.id,
      this.tenantService.getSelectedPublisherId(),
      this.tenantService.publishers().map((publisher) => publisher.id)
    );
    if (recoveryId != null) {
      void this.router.navigate(['/admin/publishers', recoveryId], { replaceUrl: true });
    }
  }

  onEdit(): void {
    void this.router.navigate(['/admin/publishers', this.id, 'edit']);
  }

  onDelete(): void {
    const name =
      this.publisher()?.name_ar ??
      this.publisher()?.name_en ??
      this.translate.instant('ADMIN.PUBLISHERS.DETAIL.DELETE_DEFAULT_NAME');
    const dir = this.translate.currentLang === 'ar' ? 'rtl' : 'ltr';
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.PUBLISHERS.DETAIL.DELETE_TITLE'),
      nzContent: this.translate.instant('ADMIN.COMMON.DELETE_CONFIRM_BODY', { name }),
      nzOkText: this.translate.instant('ADMIN.PUBLISHERS.DETAIL.DELETE_OK'),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: this.translate.instant('COMMON.CANCEL'),
      nzDirection: dir,
      nzOnOk: () =>
        this.publishersService.deletePublisher(this.id).subscribe({
          next: () => {
            this.message.success(this.translate.instant('ADMIN.PUBLISHERS.DETAIL.DELETE_SUCCESS'));
            const commands = buildSelectedPublisherDetailCommands(
              this.tenantService.getSelectedPublisherId()
            ) ?? ['/admin', 'publishers'];
            void this.router.navigate(commands);
          },
        }),
    });
  }

  countryLabel(country: string | null | undefined): string {
    return localizeCountryCodeOrName(
      country,
      this.translate.currentLang,
      createDisplayLocalizationLabels(this.translate)
    );
  }

  iconSrc(icon: string | File | null | undefined): string | undefined {
    return typeof icon === 'string' && icon.trim() ? icon : undefined;
  }
}
