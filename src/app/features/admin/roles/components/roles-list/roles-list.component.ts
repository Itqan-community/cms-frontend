import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { concatMap, forkJoin, Observable, of } from 'rxjs';
import { resolveApiErrorMessage } from '../../../../../shared/utils/api-error-resolver.util';
import { AdminTitleCountComponent } from '../../../components/admin-title-count/admin-title-count.component';
import { PORTAL_PERMISSIONS } from '../../../constants/portal-permission.constants';
import {
  GroupDetailOut,
  GroupListOut,
  GroupNamesIn,
  groupNameOrdering,
  PermissionOut,
} from '../../../members/models/groups.models';
import { GroupsService } from '../../../members/services/groups.service';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { AdminTenantService } from '../../../services/admin-tenant.service';

const NAME_MAX_LENGTH = 150; // matches the backend's auth.Group / PublisherGroup name length

/**
 * Roles (permission groups) of the selected publisher: list, create, rename, edit permissions,
 * delete. Role and permission names come from the API in the UI language (Accept-Language), so
 * everything reloads when the language or the selected publisher changes.
 */
@Component({
  selector: 'app-roles-list',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    ReactiveFormsModule,
    NgIcon,
    TranslateModule,
    NzAlertModule,
    NzButtonModule,
    NzCheckboxModule,
    NzDrawerModule,
    NzEmptyModule,
    NzFormModule,
    NzInputModule,
    NzModalModule,
    NzPopconfirmModule,
    NzSpinModule,
    NzTableModule,
    NzTagModule,
    AdminTitleCountComponent,
  ],
  templateUrl: './roles-list.component.html',
  styleUrl: './roles-list.component.less',
})
export class RolesListComponent {
  private readonly groups = inject(GroupsService);
  private readonly adminAuth = inject(AdminAuthService);
  private readonly tenant = inject(AdminTenantService);
  private readonly translate = inject(TranslateService);
  private readonly message = inject(NzMessageService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly canCreate = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_CREATE_GROUP)
  );
  readonly canUpdate = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_UPDATE_GROUP)
  );
  readonly canDelete = computed(() =>
    this.adminAuth.hasPermission(PORTAL_PERMISSIONS.PORTAL_DELETE_GROUP)
  );

  readonly roles = signal<GroupListOut[]>([]);
  readonly catalogue = signal<PermissionOut[]>([]);
  readonly loading = signal(false);
  readonly loadFailed = signal(false);

  readonly createVisible = signal(false);
  readonly creating = signal(false);
  readonly createForm = this.namesForm();

  readonly editing = signal<GroupDetailOut | null>(null);
  readonly editorLoading = signal(false);
  readonly saving = signal(false);
  readonly selected = signal<ReadonlySet<string>>(new Set());
  readonly editForm = this.namesForm();
  readonly deletingId = signal<number | null>(null);

  constructor() {
    // Reload whenever the publisher changes; language changes are handled below.
    effect(() => {
      this.tenant.selectedPublisherId();
      untracked(() => {
        this.closeEditor();
        this.load();
      });
    });
    this.translate.onLangChange.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.load();
      const current = this.editing();
      if (current) {
        this.openEditor(current);
      }
    });
  }

  load(): void {
    this.loading.set(true);
    this.loadFailed.set(false);
    forkJoin({
      roles: this.groups.list({
        page: 1,
        page_size: 100,
        ordering: groupNameOrdering(this.translate.currentLang),
      }),
      catalogue: this.groups.listPermissions(),
    }).subscribe({
      next: ({ roles, catalogue }) => {
        this.roles.set(roles.results);
        this.catalogue.set(catalogue);
        this.loading.set(false);
      },
      error: () => {
        this.loadFailed.set(true);
        this.loading.set(false);
      },
    });
  }

  // --- Create ---

  openCreate(): void {
    this.createForm.reset({ name_en: '', name_ar: '' });
    this.createVisible.set(true);
  }

  closeCreate(): void {
    this.createVisible.set(false);
  }

  submitCreate(): void {
    const names = this.validNames(this.createForm);
    if (!names) {
      return;
    }
    this.creating.set(true);
    this.groups.create(names).subscribe({
      next: (role) => {
        this.creating.set(false);
        this.createVisible.set(false);
        this.message.success(this.translate.instant('ADMIN.ROLES.MESSAGES.CREATED'));
        this.load();
        this.openEditor(role);
      },
      error: (err: unknown) => {
        this.creating.set(false);
        this.showError(err, 'ADMIN.ROLES.MESSAGES.CREATE_FAILED');
      },
    });
  }

  // --- Edit ---

  openEditor(role: GroupListOut): void {
    this.editorLoading.set(true);
    this.groups.get(role.id).subscribe({
      next: (detail) => {
        this.editorLoading.set(false);
        this.showDetail(detail);
      },
      error: (err: unknown) => {
        this.editorLoading.set(false);
        this.showError(err, 'ADMIN.ROLES.MESSAGES.LOAD_FAILED');
      },
    });
  }

  closeEditor(): void {
    this.editing.set(null);
  }

  isSelected(code: string): boolean {
    return this.selected().has(code);
  }

  togglePermission(code: string, checked: boolean): void {
    const next = new Set(this.selected());
    if (checked) {
      next.add(code);
    } else {
      next.delete(code);
    }
    this.selected.set(next);
  }

  saveEditor(): void {
    const role = this.editing();
    const names = this.validNames(this.editForm);
    if (!role || !names || !this.canUpdate()) {
      return;
    }
    const renamed = names.name_en !== role.name_en || names.name_ar !== role.name_ar;
    const requested = [...this.selected()].sort();
    const rename$: Observable<unknown> = renamed ? this.groups.update(role.id, names) : of(null);

    this.saving.set(true);
    rename$
      .pipe(
        concatMap(() => this.groups.setPermissions(role.id, requested)),
        // The caller may hold this role, so their own buttons can change.
        concatMap((saved) => this.tenant.refresh().pipe(concatMap(() => of(saved))))
      )
      .subscribe({
        next: (saved) => {
          this.saving.set(false);
          this.showDetail(saved);
          this.load();
          // CREATE implies READ etc.; tell the editor when the backend added more than they picked.
          const addedImplied = saved.permissions.length > requested.length;
          this.message.success(
            this.translate.instant(
              addedImplied
                ? 'ADMIN.ROLES.MESSAGES.SAVED_WITH_IMPLIED'
                : 'ADMIN.ROLES.MESSAGES.SAVED'
            )
          );
        },
        error: (err: unknown) => {
          this.saving.set(false);
          this.showError(err, 'ADMIN.ROLES.MESSAGES.SAVE_FAILED');
        },
      });
  }

  // --- Delete ---

  deleteRole(role: GroupListOut): void {
    this.deletingId.set(role.id);
    this.groups.delete(role.id).subscribe({
      next: () => {
        this.deletingId.set(null);
        if (this.editing()?.id === role.id) {
          this.closeEditor();
        }
        this.message.success(this.translate.instant('ADMIN.ROLES.MESSAGES.DELETED'));
        this.load();
      },
      error: (err: unknown) => {
        this.deletingId.set(null);
        this.showError(err, 'ADMIN.ROLES.MESSAGES.DELETE_FAILED');
      },
    });
  }

  // --- Helpers ---

  private namesForm() {
    return this.fb.nonNullable.group({
      name_en: ['', [Validators.required, Validators.maxLength(NAME_MAX_LENGTH)]],
      name_ar: ['', [Validators.required, Validators.maxLength(NAME_MAX_LENGTH)]],
    });
  }

  private showDetail(detail: GroupDetailOut): void {
    this.editing.set(detail);
    this.selected.set(new Set(detail.permissions.map((p) => p.code_name)));
    this.editForm.reset({ name_en: detail.name_en, name_ar: detail.name_ar });
    if (this.canUpdate()) {
      this.editForm.enable();
    } else {
      this.editForm.disable();
    }
  }

  /** Trimmed names, or null (with errors shown) when either is blank or too long. */
  private validNames(form: ReturnType<RolesListComponent['namesForm']>): GroupNamesIn | null {
    const names = {
      name_en: form.controls.name_en.value.trim(),
      name_ar: form.controls.name_ar.value.trim(),
    };
    form.setValue(names);
    if (form.invalid) {
      Object.values(form.controls).forEach((control) => {
        control.markAsDirty();
        control.updateValueAndValidity();
      });
      return null;
    }
    return names;
  }

  private showError(err: unknown, fallbackKey: string): void {
    this.message.error(resolveApiErrorMessage(err, { fallbackKey }, this.translate));
  }
}
