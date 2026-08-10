import { DatePipe, UpperCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { PORTAL_PERMISSIONS } from '../../../constants/portal-permission.constants';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { AdminTenantService } from '../../../services/admin-tenant.service';
import { AdminListBase } from '../../../utils/admin-list-base';
import { resolveApiErrorMessage } from '../../../../../shared/utils/api-error-resolver.util';
import {
  MemberFiltersComponent,
  MemberFiltersPayload,
} from '../member-filters/member-filters.component';
import { GroupListOut } from '../../models/groups.models';
import { MemberOut, MemberStatus, MemberUiFilters } from '../../models/members.models';
import { GroupsService } from '../../services/groups.service';
import { MembersService } from '../../services/members.service';

type FormModalMode = 'invite' | 'edit';

@Component({
  selector: 'app-members-list',
  standalone: true,
  imports: [
    DatePipe,
    UpperCasePipe,
    FormsModule,
    ReactiveFormsModule,
    NgIcon,
    NzAlertModule,
    NzButtonModule,
    NzFormModule,
    NzInputModule,
    NzModalModule,
    NzPaginationModule,
    NzSelectModule,
    NzSpinModule,
    NzTableModule,
    NzTagModule,
    NzToolTipModule,
    TranslateModule,
    MemberFiltersComponent,
  ],
  templateUrl: './members-list.component.html',
  styleUrl: './members-list.component.less',
})
export class MembersListComponent extends AdminListBase<MemberOut, MemberUiFilters> {
  private readonly membersService = inject(MembersService);
  private readonly groupsService = inject(GroupsService);
  private readonly adminAuth = inject(AdminAuthService);
  private readonly tenantService = inject(AdminTenantService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly fb = inject(FormBuilder);

  readonly canInvite = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_INVITE_PUBLISHER_MEMBERS)
  );

  readonly canUpdate = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_UPDATE_PUBLISHER_MEMBERS)
  );

  readonly canDelete = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_DELETE_PUBLISHER_MEMBERS)
  );

  readonly loadFailed = signal(false);
  readonly formModalVisible = signal(false);
  readonly formModalMode = signal<FormModalMode>('invite');
  readonly formSubmitting = signal(false);
  readonly editingMember = signal<MemberOut | null>(null);
  readonly groupOptions = signal<GroupListOut[]>([]);
  readonly groupsLoading = signal(false);
  readonly groupsLoadFailed = signal(false);

  readonly membersTableStorageKey = 'admin-list-members';

  readonly memberForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    group_id: [null as number | null, Validators.required],
  });

  constructor() {
    super();
    this.initList(this.membersTableStorageKey);
  }

  get isInviteMode(): boolean {
    return this.formModalMode() === 'invite';
  }

  onMemberFiltersChange(filters: MemberFiltersPayload): void {
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
    const publisherId = this.tenantService.selectedPublisherId();
    if (publisherId == null) {
      this.items.set([]);
      this.total.set(0);
      return;
    }

    this.loading.set(true);
    this.loadFailed.set(false);

    const statusRaw = this.activeFilters['status'];
    const status = statusRaw === 'pending' || statusRaw === 'active' ? statusRaw : undefined;
    const searchRaw = this.activeFilters['search'];
    const search =
      searchRaw != null && String(searchRaw).trim() !== '' ? String(searchRaw) : undefined;

    this.membersService
      .list({
        page: this.page(),
        page_size: this.pageSize(),
        ordering: this.ordering ?? undefined,
        publisher_id: publisherId,
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

  openInviteModal(): void {
    this.formModalMode.set('invite');
    this.editingMember.set(null);
    this.memberForm.reset({ name: '', email: '', group_id: null });
    this.memberForm.controls.email.enable();
    this.formModalVisible.set(true);
    this.loadGroupsForModal();
  }

  openEditModal(member: MemberOut): void {
    this.formModalMode.set('edit');
    this.editingMember.set(member);
    this.memberForm.reset({
      name: member.name,
      email: member.email,
      group_id: null,
    });
    this.memberForm.controls.email.disable();
    this.formModalVisible.set(true);
    this.loadGroupsForModal(member.role);
  }

  closeFormModal(): void {
    if (this.formSubmitting()) {
      return;
    }
    this.formModalVisible.set(false);
    this.editingMember.set(null);
  }

  onFormModalVisibleChange(visible: boolean): void {
    if (!visible) {
      this.closeFormModal();
      return;
    }
    this.formModalVisible.set(true);
  }

  submitFormModal(): boolean {
    if (this.memberForm.invalid) {
      this.memberForm.markAllAsTouched();
      return false;
    }

    if (this.isInviteMode) {
      this.submitInvite();
      return false;
    }

    const member = this.editingMember();
    if (!member) {
      return false;
    }

    const { name, group_id } = this.memberForm.getRawValue();
    if (group_id == null || this.resolveGroupName(group_id) == null) {
      this.memberForm.controls.group_id.setErrors({ required: true });
      this.memberForm.controls.group_id.markAsTouched();
      return false;
    }

    const currentGroupId = this.groupOptions().find((g) => g.name === member.role)?.id ?? null;
    const body: { name?: string; group_id?: number } = {};
    if (name.trim() !== member.name) {
      body.name = name.trim();
    }
    if (group_id !== currentGroupId) {
      body.group_id = group_id;
    }

    if (!Object.keys(body).length) {
      this.closeFormModal();
      return false;
    }

    if (body.group_id != null) {
      this.modal.confirm({
        nzTitle: this.translate.instant('ADMIN.MEMBERS.CHANGE_GROUP.CONFIRM_TITLE'),
        nzContent: this.translate.instant('ADMIN.MEMBERS.CHANGE_GROUP.CONFIRM_BODY', {
          name: member.name,
          group: this.resolveGroupName(body.group_id) ?? '',
        }),
        nzOkText: this.translate.instant('ADMIN.MEMBERS.FORM.CONFIRM_OK'),
        nzCancelText: this.translate.instant('ADMIN.MEMBERS.FORM.CONFIRM_CANCEL'),
        nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
        nzOnOk: () => this.patchMember(member, body, true),
      });
      return false;
    }

    this.patchMember(member, body, false);
    return false;
  }

  onRemove(member: MemberOut): void {
    const isPending = member.status === 'pending';
    this.modal.confirm({
      nzTitle: this.translate.instant(
        isPending ? 'ADMIN.MEMBERS.CANCEL.CONFIRM_TITLE' : 'ADMIN.MEMBERS.REMOVE.CONFIRM_TITLE'
      ),
      nzContent: this.translate.instant(
        isPending ? 'ADMIN.MEMBERS.CANCEL.CONFIRM_BODY' : 'ADMIN.MEMBERS.REMOVE.CONFIRM_BODY',
        { name: member.name }
      ),
      nzOkText: this.translate.instant(
        isPending ? 'ADMIN.MEMBERS.CANCEL.CONFIRM_OK' : 'ADMIN.MEMBERS.REMOVE.CONFIRM_OK'
      ),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.MEMBERS.FORM.CONFIRM_CANCEL'),
      nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
      nzOnOk: () =>
        this.membersService.remove(member.id).subscribe({
          next: () => {
            this.message.success(
              this.translate.instant(
                isPending
                  ? 'ADMIN.MEMBERS.MESSAGES.CANCEL_SUCCESS'
                  : 'ADMIN.MEMBERS.MESSAGES.REMOVE_SUCCESS'
              )
            );
            this.load();
          },
          error: (err) => {
            this.message.error(this.apiErrorMessage(err, 'ADMIN.MEMBERS.MESSAGES.REMOVE_ERROR'));
          },
        }),
    });
  }

  onResend(member: MemberOut): void {
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.MEMBERS.RESEND.CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.MEMBERS.RESEND.CONFIRM_BODY', {
        name: member.name,
      }),
      nzOkText: this.translate.instant('ADMIN.MEMBERS.RESEND.CONFIRM_OK'),
      nzCancelText: this.translate.instant('ADMIN.MEMBERS.FORM.CONFIRM_CANCEL'),
      nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
      nzOnOk: () =>
        this.membersService.resend(member.id).subscribe({
          next: () => {
            this.message.success(this.translate.instant('ADMIN.MEMBERS.MESSAGES.RESEND_SUCCESS'));
            this.load();
          },
          error: (err) => {
            this.message.error(this.apiErrorMessage(err, 'ADMIN.MEMBERS.MESSAGES.RESEND_ERROR'));
          },
        }),
    });
  }

  canManageRow(member: MemberOut): boolean {
    if (this.adminAuth.isItqanAdmin()) {
      return true;
    }
    const currentEmail = this.adminAuth.currentUser()?.email?.toLowerCase();
    return !currentEmail || member.email.toLowerCase() !== currentEmail;
  }

  statusTagColor(status: MemberStatus): string {
    return status === 'pending' ? 'gold' : 'success';
  }

  expiresInDays(expiresAt: string | null): string | null {
    if (!expiresAt) {
      return null;
    }
    const expires = new Date(expiresAt).getTime();
    const now = Date.now();
    const diffMs = expires - now;
    if (diffMs <= 0) {
      return this.translate.instant('ADMIN.MEMBERS.EXPIRES_TODAY');
    }
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return this.translate.instant('ADMIN.MEMBERS.EXPIRES_IN_DAYS', { days });
  }

  private loadGroupsForModal(matchRoleName?: string): void {
    this.groupsLoading.set(true);
    this.groupsLoadFailed.set(false);
    this.groupsService.list({ page: 1, page_size: 100, ordering: 'name' }).subscribe({
      next: (res) => {
        this.groupOptions.set(res.results);
        this.groupsLoading.set(false);

        if (matchRoleName != null) {
          const matched = res.results.find((g) => g.name === matchRoleName);
          if (matched) {
            this.memberForm.controls.group_id.setValue(matched.id);
          } else {
            this.memberForm.controls.group_id.setValue(null);
            this.memberForm.controls.group_id.markAsTouched();
          }
          return;
        }

        if (this.isInviteMode && res.results.length > 0) {
          this.memberForm.controls.group_id.setValue(res.results[0].id);
        }
      },
      error: () => {
        this.groupOptions.set([]);
        this.groupsLoading.set(false);
        this.groupsLoadFailed.set(true);
        this.message.error(this.translate.instant('ADMIN.MEMBERS.MESSAGES.GROUPS_LOAD_ERROR'));
      },
    });
  }

  private resolveGroupName(groupId: number | null): string | null {
    if (groupId == null) {
      return null;
    }
    return this.groupOptions().find((g) => g.id === groupId)?.name ?? null;
  }

  private submitInvite(): void {
    const publisherId = this.tenantService.selectedPublisherId();
    if (publisherId == null) {
      this.message.error(this.translate.instant('ADMIN.MEMBERS.MESSAGES.NO_PUBLISHER'));
      return;
    }

    const { name, email, group_id } = this.memberForm.getRawValue();
    if (group_id == null || this.resolveGroupName(group_id) == null) {
      this.memberForm.controls.group_id.setErrors({ required: true });
      this.memberForm.controls.group_id.markAsTouched();
      return;
    }

    this.formSubmitting.set(true);

    this.membersService
      .invite({
        publisher_id: publisherId,
        name: name.trim(),
        email: email.trim(),
        group_id,
      })
      .subscribe({
        next: () => {
          this.formSubmitting.set(false);
          this.formModalVisible.set(false);
          this.message.success(this.translate.instant('ADMIN.MEMBERS.MESSAGES.INVITE_SUCCESS'));
          this.load();
        },
        error: (err) => {
          this.formSubmitting.set(false);
          this.message.error(this.apiErrorMessage(err, 'ADMIN.MEMBERS.MESSAGES.INVITE_ERROR'));
        },
      });
  }

  private patchMember(
    member: MemberOut,
    body: { name?: string; group_id?: number },
    groupChanged: boolean
  ): void {
    this.formSubmitting.set(true);
    this.membersService.update(member.id, body).subscribe({
      next: () => {
        this.formSubmitting.set(false);
        this.formModalVisible.set(false);
        this.editingMember.set(null);

        const toastKey = groupChanged
          ? 'ADMIN.MEMBERS.MESSAGES.CHANGE_GROUP_SUCCESS'
          : 'ADMIN.MEMBERS.MESSAGES.UPDATE_SUCCESS';
        this.message.success(this.translate.instant(toastKey));
        this.load();
      },
      error: (err) => {
        this.formSubmitting.set(false);
        this.message.error(this.apiErrorMessage(err, 'ADMIN.MEMBERS.MESSAGES.UPDATE_ERROR'));
      },
    });
  }

  private apiErrorMessage(err: unknown, fallbackKey: string): string {
    return resolveApiErrorMessage(err, { fallbackKey }, this.translate);
  }
}
