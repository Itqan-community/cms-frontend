import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { Subject, catchError, finalize, map, of, switchMap } from 'rxjs';
import { resolveApiErrorMessage } from '../../../../shared/utils/api-error-resolver.util';
import type { AssetTemplate } from '../../models/asset-content.models';
import type {
  ImportColumnField,
  ImportColumnInput,
  ImportColumnMapping,
  ImportColumnsPreview,
} from '../../models/asset-versions.models';
import { AssetVersionsService } from '../../services/asset-versions.service';

const UNIT_FIELD_KEYS: Record<string, string> = {
  surah: 'SURAH',
  ayah: 'AYAH',
  word: 'WORD',
  word_id: 'WORD_ID',
  page: 'PAGE',
  from_surah: 'FROM_SURAH',
  from_ayah: 'FROM_AYAH',
  from_word: 'FROM_WORD',
  to_surah: 'TO_SURAH',
  to_ayah: 'TO_AYAH',
  to_word: 'TO_WORD',
};

/**
 * Matches a content file's columns to a text asset's fields before upload.
 *
 * When `file` changes, the start of the file is sent to the backend, which reads
 * its header row and matches what it can by name. If a required field is left
 * unmatched the mapping dialog opens; the upload stays blocked (`readyChange`
 * false) until the user maps every required field. A confirmed mapping is
 * emitted through `mappingChange`; `null` means "use the file's headers".
 *
 * Give `slug` for an existing text asset, or `template` (plus the `columns` the
 * create form will send; unset: just `text`) for one that is being created.
 * Changing the template or columns re-reads the file without reopening the dialog.
 */
@Component({
  selector: 'app-import-column-mapping',
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    NzAlertModule,
    NzButtonModule,
    NzModalModule,
    NzSelectModule,
  ],
  templateUrl: './import-column-mapping.component.html',
  styleUrl: './import-column-mapping.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportColumnMappingComponent {
  private readonly versions = inject(AssetVersionsService);
  private readonly translate = inject(TranslateService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly slug = input<string | null>(null);
  readonly template = input<AssetTemplate | null>(null);
  readonly columns = input<ImportColumnInput[] | null>(null);
  readonly file = input<File | null>(null);
  readonly mappingChange = output<ImportColumnMapping | null>();
  readonly readyChange = output<boolean>();

  readonly preview = signal<ImportColumnsPreview | null>(null);
  readonly loading = signal(false);
  readonly dialogOpen = signal(false);
  /** Per file column (by index): the field key it fills, or null (ignored). */
  readonly draft = signal<(string | null)[]>([]);
  /** The mapping the user confirmed; null while the file's own headers are used. */
  readonly confirmed = signal<ImportColumnMapping | null>(null);

  /** Import may run: no file, the headers matched, or the user mapped the columns. */
  readonly ready = computed(() => {
    if (this.loading()) return false;
    const preview = this.preview();
    return !preview || preview.complete || this.confirmed() !== null;
  });

  readonly draftMapping = computed(() => this.toMapping(this.draft()));
  /** The required fields the draft still lacks (of the closest required set). */
  readonly draftMissing = computed(() => this.missingFields(this.draftMapping()));
  readonly draftComplete = computed(() => this.draftMissing().length === 0);
  /** Word files name their word by `word_id` or by surah + ayah + word. */
  readonly hasAlternatives = computed(() => (this.preview()?.required.length ?? 0) > 1);
  readonly ignoredCount = computed(() => this.draft().filter((key) => key === null).length);

  readonly rows = computed(() => {
    const preview = this.preview();
    if (!preview) return [];
    return preview.headers.map((header, index) => ({
      index,
      header,
      samples: preview.samples
        .map((row) => row[index] ?? '')
        .filter((cell) => cell !== '')
        .slice(0, 3),
    }));
  });

  private readonly load$ = new Subject<{ file: File | null; autoOpen: boolean }>();
  /** What the file is matched against: the asset, or the new asset's template and columns. */
  private readonly target = computed(() =>
    JSON.stringify([this.slug(), this.template(), this.columns()])
  );

  constructor() {
    this.load$
      .pipe(
        switchMap(({ file, autoOpen }) => {
          this.reset();
          const request$ = file ? this.request(file) : null;
          if (!request$) return of(null);
          this.loading.set(true);
          return request$.pipe(
            map((preview) => ({ preview, autoOpen })),
            catchError((err: unknown) => {
              if (!(err instanceof HttpErrorResponse && err.status === 0)) {
                this.message.error(
                  resolveApiErrorMessage(
                    err,
                    { fallbackKey: 'ADMIN.IMPORT_COLUMNS.PREVIEW_ERROR' },
                    this.translate
                  )
                );
              }
              return of(null);
            }),
            finalize(() => this.loading.set(false))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((loaded) => {
        if (!loaded) return;
        this.preview.set(loaded.preview);
        if (loaded.autoOpen && !loaded.preview.complete) this.openDialog();
      });

    let lastFile: File | null = null;
    effect(() => {
      const file = this.file();
      this.target();
      untracked(() => {
        this.load$.next({ file, autoOpen: file !== lastFile });
        lastFile = file;
      });
    });
    effect(() => this.readyChange.emit(this.ready()));
  }

  openDialog(): void {
    const preview = this.preview();
    if (!preview) return;
    const mapping = this.confirmed() ?? preview.mapping;
    const draft: (string | null)[] = preview.headers.map(() => null);
    for (const [key, index] of Object.entries(mapping)) {
      if (index !== null && index >= 0 && index < draft.length) draft[index] = key;
    }
    this.draft.set(draft);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
  }

  /** Assign `key` to column `index`; a field fills one column, so it leaves any other. */
  assign(index: number, key: string | null): void {
    this.draft.update((draft) =>
      draft.map((current, i) => (i === index ? key : current === key ? null : current))
    );
  }

  confirm(): void {
    if (!this.draftComplete()) return;
    const preview = this.preview();
    const mapping: ImportColumnMapping = {};
    for (const field of preview?.fields ?? []) {
      mapping[field.key] = this.draftMapping()[field.key] ?? null;
    }
    this.confirmed.set(mapping);
    this.mappingChange.emit(mapping);
    this.dialogOpen.set(false);
  }

  fieldLabel(field: ImportColumnField): string {
    if (field.kind === 'unit') {
      const key = UNIT_FIELD_KEYS[field.key];
      return key ? this.translate.instant(`ADMIN.IMPORT_COLUMNS.FIELDS.${key}`) : field.key;
    }
    const label = (this.translate.currentLang === 'ar' ? field.label_ar : field.label_en)?.trim();
    const name = label || field.label_en?.trim() || field.key;
    return this.translate.instant('ADMIN.IMPORT_COLUMNS.TEXT_FIELD', { name });
  }

  labelForKey(key: string): string {
    const field = this.preview()?.fields.find((f) => f.key === key);
    return field ? this.fieldLabel(field) : key;
  }

  missingLabels(): string {
    return this.draftMissing()
      .map((key) => this.labelForKey(key))
      .join(this.translate.currentLang === 'ar' ? '، ' : ', ');
  }

  columnName(header: string, index: number): string {
    return (
      header || this.translate.instant('ADMIN.IMPORT_COLUMNS.UNNAMED_COLUMN', { n: index + 1 })
    );
  }

  private request(file: File) {
    const slug = this.slug();
    if (slug) return this.versions.previewImportColumns(slug, file);
    const template = this.template();
    if (template) return this.versions.previewNewAssetImportColumns(template, this.columns(), file);
    return null;
  }

  private reset(): void {
    this.preview.set(null);
    this.draft.set([]);
    this.dialogOpen.set(false);
    if (this.confirmed() !== null) {
      this.confirmed.set(null);
      this.mappingChange.emit(null);
    }
  }

  private toMapping(draft: (string | null)[]): Record<string, number> {
    const mapping: Record<string, number> = {};
    draft.forEach((key, index) => {
      if (key !== null) mapping[key] = index;
    });
    return mapping;
  }

  private missingFields(mapping: Record<string, number>): string[] {
    const required = this.preview()?.required ?? [];
    if (!required.length) return [];
    const missing = required.map((fields) => fields.filter((key) => !(key in mapping)));
    return missing.reduce((best, current) => (current.length < best.length ? current : best));
  }
}
