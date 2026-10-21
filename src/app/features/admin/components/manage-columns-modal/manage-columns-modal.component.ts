import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import type { Observable } from 'rxjs';
import type { AssetColumn, AssetVersionParentKind } from '../../models/asset-content.models';
import { AssetContentService } from '../../services/asset-content.service';

/** Same rule as the backend's `validate_column_key` (reserved names are checked there). */
const KEY_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

/**
 * Add, label, reorder and delete an asset's text columns (users with the
 * manage-columns permission). A column a committed version contains keeps its
 * key and can't be deleted; its labels can always change.
 */
@Component({
  selector: 'app-manage-columns-modal',
  standalone: true,
  imports: [
    FormsModule,
    NgIcon,
    NzButtonModule,
    NzInputModule,
    NzModalModule,
    NzPopconfirmModule,
    TranslateModule,
  ],
  templateUrl: './manage-columns-modal.component.html',
  styleUrl: './manage-columns-modal.component.less',
})
export class ManageColumnsModalComponent {
  readonly kind = input.required<AssetVersionParentKind>();
  readonly slug = input.required<string>();
  readonly columns = input.required<AssetColumn[]>();
  readonly visible = input(false);
  /** The column the dialog was opened from (its header gear), highlighted. */
  readonly focusKey = input<string | null>(null);
  readonly closed = output<void>();
  readonly changed = output<void>();

  private readonly contentService = inject(AssetContentService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly newKey = signal('');
  readonly newLabelEn = signal('');
  readonly newLabelAr = signal('');
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly anyCommitted = computed(() => this.columns().some((column) => column.committed));

  canEditKey(column: AssetColumn): boolean {
    return !column.committed;
  }

  canDelete(column: AssetColumn): boolean {
    return !column.committed && this.columns().length > 1;
  }

  add(): void {
    const key = this.newKey().trim();
    if (!KEY_PATTERN.test(key)) {
      this.error.set(this.errorMessage('column_key_invalid'));
      return;
    }
    this.run(
      this.contentService.createColumn(this.kind(), this.slug(), {
        key,
        label_en: this.newLabelEn().trim(),
        label_ar: this.newLabelAr().trim(),
      }),
      () => {
        this.newKey.set('');
        this.newLabelEn.set('');
        this.newLabelAr.set('');
      }
    );
  }

  /** Save one field of a column (key, label_en or label_ar) when it changed. */
  save(column: AssetColumn, field: 'key' | 'label_en' | 'label_ar', value: string): void {
    const next = value.trim();
    if (next === column[field]) return;
    if (field === 'key' && !KEY_PATTERN.test(next)) {
      this.error.set(this.errorMessage('column_key_invalid'));
      return;
    }
    this.run(
      this.contentService.updateColumn(this.kind(), this.slug(), column.key, { [field]: next })
    );
  }

  /** Move the column at ``index`` by ``delta`` places. */
  move(index: number, delta: number): void {
    const keys = this.columns().map((column) => column.key);
    const target = index + delta;
    if (target < 0 || target >= keys.length) return;
    [keys[index], keys[target]] = [keys[target], keys[index]];
    this.run(this.contentService.reorderColumns(this.kind(), this.slug(), keys));
  }

  remove(column: AssetColumn): void {
    this.run(this.contentService.deleteColumn(this.kind(), this.slug(), column.key));
  }

  close(): void {
    this.error.set(null);
    this.closed.emit();
  }

  private run(request: Observable<unknown>, after?: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.busy.set(false);
        after?.();
        this.changed.emit();
      },
      error: (err: HttpErrorResponse) => {
        this.busy.set(false);
        this.error.set(this.errorMessage(err?.error?.error_name, err?.error?.message));
      },
    });
  }

  private errorMessage(name: string | undefined, fallback?: string): string {
    if (!name)
      return (
        fallback ?? this.translate.instant('ADMIN.CONTENT_EDITOR.COLUMNS_MANAGE.ERRORS.GENERIC')
      );
    const key = `ADMIN.CONTENT_EDITOR.COLUMNS_MANAGE.ERRORS.${name.toUpperCase()}`;
    const translated = this.translate.instant(key);
    return translated === key && fallback ? fallback : translated;
  }
}
