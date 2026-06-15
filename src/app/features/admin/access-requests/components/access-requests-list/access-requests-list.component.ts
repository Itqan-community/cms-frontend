import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { PORTAL_PERMISSIONS } from '../../../constants/portal-permission.constants';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { AdminListBase } from '../../../utils/admin-list-base';
import {
  AccessRequestOut,
  AccessRequestStatus,
  AccessRequestUiFilters,
  IntendedUse,
} from '../../models/access-requests.models';
import { AccessRequestsService } from '../../services/access-requests.service';
import { AccessRequestDetailDrawerComponent } from '../access-request-detail-drawer/access-request-detail-drawer.component';
import {
  AccessRequestFiltersComponent,
  AccessRequestFiltersPayload,
} from '../access-request-filters/access-request-filters.component';

interface ApiErrorBody {
  error_name?: string;
  message?: string;
}

@Component({
  selector: 'app-access-requests-list',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    NgIcon,
    NzAlertModule,
    NzButtonModule,
    NzFormModule,
    NzInputModule,
    NzModalModule,
    NzPaginationModule,
    NzSpinModule,
    NzSwitchModule,
    NzTableModule,
    NzTagModule,
    NzToolTipModule,
    TranslateModule,
    AccessRequestFiltersComponent,
    AccessRequestDetailDrawerComponent,
  ],
  templateUrl: './access-requests-list.component.html',
  styleUrl: './access-requests-list.component.less',
})
export class AccessRequestsListComponent
  extends AdminListBase<AccessRequestOut, AccessRequestUiFilters>
  implements OnInit
{
  private readonly accessRequestsService = inject(AccessRequestsService);
  private readonly adminAuth = inject(AdminAuthService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);

  readonly canAcceptOrReject = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_ACCEPT_OR_REJECT_ACCESS_REQUESTS)
  );

  readonly canToggleAutoAcceptance = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_TOGGLE_ACCESS_REQUESTS_AUTO_ACCEPTANCE)
  );

  readonly loadFailed = signal(false);
  readonly autoAcceptLoading = signal(false);
  readonly autoAcceptSaving = signal(false);
  readonly autoAccept = signal(true);

  readonly rejectModalVisible = signal(false);
  readonly rejectSubmitting = signal(false);
  readonly rejectingRequest = signal<AccessRequestOut | null>(null);

  readonly drawerVisible = signal(false);
  readonly drawerRequestId = signal<number | null>(null);

  readonly accessRequestsTableStorageKey = 'admin-list-access-requests';

  readonly rejectForm = this.fb.nonNullable.group({
    rejection_reason: ['', [Validators.required, Validators.minLength(1)]],
  });

  constructor() {
    super();
    this.initList(this.accessRequestsTableStorageKey);
  }

  ngOnInit(): void {
    this.loadAutoAcceptance();
  }

  onAccessRequestFiltersChange(filters: AccessRequestFiltersPayload): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: null,
        search: filters.search || null,
        status: filters.status || null,
        page_size: this.pageSize() !== 10 ? this.pageSize() : null,
        ordering: this.ordering || null,
      },
      queryParamsHandling: 'merge',
    });
  }

  load(): void {
    this.loading.set(true);
    this.loadFailed.set(false);

    const statusRaw = this.activeFilters['status'];
    const status =
      statusRaw === 'pending' || statusRaw === 'approved' || statusRaw === 'rejected'
        ? statusRaw
        : undefined;
    const searchRaw = this.activeFilters['search'];
    const search =
      searchRaw != null && String(searchRaw).trim() !== '' ? String(searchRaw) : undefined;

    this.accessRequestsService
      .list({
        page: this.page(),
        page_size: this.pageSize(),
        ordering: this.ordering ?? undefined,
        status,
        search,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.results);
          this.total.set(res.count);
          this.loading.set(false);
        },
        error: () => {
          this.items.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.loadFailed.set(true);
        },
      });
  }

  onAutoAcceptChange(next: boolean): void {
    if (this.autoAcceptSaving() || !this.canToggleAutoAcceptance()) {
      return;
    }

    const prev = this.autoAccept();
    if (next === prev) {
      return;
    }

    if (!next) {
      this.autoAccept.set(true);
      this.modal.confirm({
        nzTitle: this.translate.instant('ADMIN.ACCESS_REQUESTS.TOGGLE.CONFIRM_OFF_TITLE'),
        nzContent: this.translate.instant('ADMIN.ACCESS_REQUESTS.TOGGLE.CONFIRM_OFF_BODY'),
        nzOkText: this.translate.instant('ADMIN.ACCESS_REQUESTS.TOGGLE.CONFIRM_OFF_OK'),
        nzCancelText: this.translate.instant('ADMIN.ACCESS_REQUESTS.FORM.CANCEL'),
        nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
        nzOnOk: () => this.saveAutoAcceptance(false),
      });
      return;
    }

    this.saveAutoAcceptance(true);
  }

  openDetailDrawer(row: AccessRequestOut): void {
    this.drawerRequestId.set(row.id);
    this.drawerVisible.set(true);
  }

  closeDetailDrawer(): void {
    this.drawerVisible.set(false);
    this.drawerRequestId.set(null);
  }

  onAccept(row: AccessRequestOut): void {
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.ACCESS_REQUESTS.ACCEPT.CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.ACCESS_REQUESTS.ACCEPT.CONFIRM_BODY', {
        name: row.developer.name,
        asset: row.asset.name,
      }),
      nzOkText: this.translate.instant('ADMIN.ACCESS_REQUESTS.ACCEPT.CONFIRM_OK'),
      nzCancelText: this.translate.instant('ADMIN.ACCESS_REQUESTS.FORM.CANCEL'),
      nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
      nzOnOk: () =>
        this.accessRequestsService.accept(row.id).subscribe({
          next: () => {
            this.message.success(
              this.translate.instant('ADMIN.ACCESS_REQUESTS.MESSAGES.ACCEPT_SUCCESS')
            );
            this.load();
          },
          error: (err) =>
            this.handleActionError(err, 'ADMIN.ACCESS_REQUESTS.MESSAGES.ACCEPT_ERROR'),
        }),
    });
  }

  openRejectModal(row: AccessRequestOut): void {
    this.rejectingRequest.set(row);
    this.rejectForm.reset({ rejection_reason: '' });
    this.rejectModalVisible.set(true);
  }

  closeRejectModal(): void {
    if (this.rejectSubmitting()) {
      return;
    }
    this.rejectModalVisible.set(false);
    this.rejectingRequest.set(null);
  }

  onRejectModalVisibleChange(visible: boolean): void {
    if (!visible) {
      this.closeRejectModal();
      return;
    }
    this.rejectModalVisible.set(true);
  }

  submitRejectModal(): boolean {
    if (this.rejectForm.invalid) {
      this.rejectForm.markAllAsTouched();
      return false;
    }

    const row = this.rejectingRequest();
    if (!row) {
      return false;
    }

    const { rejection_reason } = this.rejectForm.getRawValue();
    this.rejectSubmitting.set(true);

    this.accessRequestsService
      .reject(row.id, { rejection_reason: rejection_reason.trim() })
      .subscribe({
        next: () => {
          this.rejectSubmitting.set(false);
          this.rejectModalVisible.set(false);
          this.rejectingRequest.set(null);
          this.message.success(
            this.translate.instant('ADMIN.ACCESS_REQUESTS.MESSAGES.REJECT_SUCCESS')
          );
          this.load();
        },
        error: (err) => {
          this.rejectSubmitting.set(false);
          this.handleActionError(err, 'ADMIN.ACCESS_REQUESTS.MESSAGES.REJECT_ERROR');
        },
      });

    return false;
  }

  statusTagColor(status: AccessRequestStatus): string {
    switch (status) {
      case 'pending':
        return 'gold';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  }

  statusLabel(status: AccessRequestStatus): string {
    return this.translate.instant(`ADMIN.ACCESS_REQUESTS.STATUS.${status.toUpperCase()}`);
  }

  intendedUseLabel(use: IntendedUse): string {
    const key = use === 'non-commercial' ? 'NON_COMMERCIAL' : 'COMMERCIAL';
    return this.translate.instant(`ADMIN.ACCESS_REQUESTS.INTENDED_USE.${key}`);
  }

  private loadAutoAcceptance(): void {
    this.autoAcceptLoading.set(true);
    this.accessRequestsService.getAutoAcceptance().subscribe({
      next: (res) => {
        this.autoAccept.set(res.auto_accept_access_requests);
        this.autoAcceptLoading.set(false);
      },
      error: () => {
        this.autoAcceptLoading.set(false);
      },
    });
  }

  private saveAutoAcceptance(value: boolean): void {
    this.autoAcceptSaving.set(true);
    this.accessRequestsService.setAutoAcceptance({ auto_accept_access_requests: value }).subscribe({
      next: (res) => {
        this.autoAccept.set(res.auto_accept_access_requests);
        this.autoAcceptSaving.set(false);
        this.message.success(
          this.translate.instant(
            value
              ? 'ADMIN.ACCESS_REQUESTS.MESSAGES.TOGGLE_ON_SUCCESS'
              : 'ADMIN.ACCESS_REQUESTS.MESSAGES.TOGGLE_OFF_SUCCESS'
          )
        );
      },
      error: (err) => {
        this.autoAcceptSaving.set(false);
        this.loadAutoAcceptance();
        this.message.error(
          this.apiErrorMessage(err, 'ADMIN.ACCESS_REQUESTS.MESSAGES.TOGGLE_ERROR')
        );
      },
    });
  }

  private handleActionError(err: unknown, fallbackKey: string): void {
    const body = (err as { error?: ApiErrorBody })?.error;
    if (body?.error_name === 'invalid_status') {
      this.message.warning(
        this.translate.instant('ADMIN.ACCESS_REQUESTS.MESSAGES.ALREADY_DECIDED')
      );
      this.load();
      return;
    }
    this.message.error(this.apiErrorMessage(err, fallbackKey));
  }

  private apiErrorMessage(err: unknown, fallbackKey: string): string {
    const message = (err as { error?: ApiErrorBody })?.error?.message;
    if (message) {
      return message;
    }
    return this.translate.instant(fallbackKey);
  }
}
