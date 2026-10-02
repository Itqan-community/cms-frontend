import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize } from 'rxjs';
import type { AssetTemplate, AssetVersionParentKind } from '../../models/asset-content.models';
import { AssetContentService } from '../../services/asset-content.service';

/**
 * "Download CSV template" for translations and tafsirs: an empty sheet listing
 * every surah / ayah / word / page of the template with a blank text column,
 * which the user fills in and uploads as a version.
 *
 * Give `slug` for an existing asset (its own template is used), or `template`
 * (plus `mushafLayoutId` for `page`) while the asset is still being created.
 */
@Component({
  selector: 'app-csv-template-download',
  standalone: true,
  imports: [NgIcon, TranslateModule, NzButtonModule],
  template: `
    <div class="csv-template-download">
      <button
        nz-button
        nzType="link"
        type="button"
        class="csv-template-download__button"
        [disabled]="!ready()"
        [nzLoading]="downloading()"
        (click)="download()"
      >
        <ng-icon name="lucideDownload" />
        {{ 'ADMIN.CSV_TEMPLATE.DOWNLOAD' | translate }}
      </button>
      <span class="csv-template-download__hint">
        {{
          (ready() ? 'ADMIN.CSV_TEMPLATE.HINT' : 'ADMIN.CSV_TEMPLATE.PICK_TEMPLATE_FIRST')
            | translate
        }}
      </span>
    </div>
  `,
  styles: [
    `
      .csv-template-download {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 4px 8px;
        margin-block: 8px;
      }
      .csv-template-download__button {
        padding-inline: 0;
      }
      .csv-template-download__hint {
        font-size: 0.875rem;
        color: var(--admin-text-500);
      }
    `,
  ],
})
export class CsvTemplateDownloadComponent {
  private readonly contentService = inject(AssetContentService);
  private readonly message = inject(NzMessageService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly kind = input.required<AssetVersionParentKind>();
  /** Existing asset: download its own template. */
  readonly slug = input<string | null>(null);
  /** Asset being created: the chosen template (and layout, for `page`). */
  readonly template = input<AssetTemplate | null>(null);
  readonly mushafLayoutId = input<number | null>(null);
  /** Base of the saved file's name for an existing asset (falls back to the slug). */
  readonly assetName = input<string | null>(null);

  readonly downloading = signal(false);
  readonly ready = computed(() => {
    if (this.slug()) return true;
    const template = this.template();
    return !!template && (template !== 'page' || this.mushafLayoutId() != null);
  });

  download(): void {
    if (!this.ready() || this.downloading()) return;
    const slug = this.slug();
    const request$ = slug
      ? this.contentService.downloadAssetCsvTemplate(this.kind(), slug)
      : this.contentService.downloadCsvTemplate(
          this.kind(),
          this.template()!,
          this.mushafLayoutId()
        );
    // The backend's Content-Disposition isn't exposed cross-origin, so name it here.
    const base = slug ? this.assetName()?.trim() || slug : this.template()!;
    const filename = `${base.replace(/\s+/g, '_')}-template.csv`;

    this.downloading.set(true);
    request$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.downloading.set(false))
      )
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = filename;
          anchor.rel = 'noopener';
          anchor.click();
          URL.revokeObjectURL(url);
        },
        error: () =>
          this.message.error(this.translate.instant('ADMIN.CONTENT_EDITOR.ERRORS.GENERIC')),
      });
  }
}
