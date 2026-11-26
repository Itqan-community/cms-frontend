import { Component, computed, input, model, output } from '@angular/core';
import { ControlContainer, FormGroupDirective, ReactiveFormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import type { AssetTemplate, AssetVersionParentKind } from '../../models/asset-content.models';
import type { ImportColumnInput, ImportColumnMapping } from '../../models/asset-versions.models';
import { CsvTemplateDownloadComponent } from '../csv-template-download/csv-template-download.component';
import { ImportColumnMappingComponent } from '../import-column-mapping/import-column-mapping.component';

const I18N = 'ADMIN.COMMON.INITIAL_VERSION';

@Component({
  selector: 'app-asset-initial-version-fields',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    NgIcon,
    NzButtonModule,
    NzFormModule,
    NzGridModule,
    NzInputModule,
    CsvTemplateDownloadComponent,
    ImportColumnMappingComponent,
  ],
  viewProviders: [{ provide: ControlContainer, useExisting: FormGroupDirective }],
  templateUrl: './asset-initial-version-fields.component.html',
  styleUrl: './asset-initial-version-fields.component.less',
})
export class AssetInitialVersionFieldsComponent {
  /** Content file for the first asset version (distinct from thumbnail). */
  readonly versionFile = model<File | null>(null);
  readonly selectedFileName = computed(() => this.versionFile()?.name ?? null);
  /** Translations/tafsirs only: offers the empty CSV template for the chosen
   *  content template. Left unset (fonts, mushafs), no template is offered. */
  readonly contentKind = input<AssetVersionParentKind | null>(null);
  readonly contentTemplate = input<AssetTemplate | null>(null);
  readonly mushafLayoutId = input<number | null>(null);
  /** The columns the new asset will have, for the template (unset: just `text`). */
  readonly columnKeys = input<string[] | null>(null);
  /** Text assets: match the file's columns to the template's fields before create. */
  readonly mapColumns = input(false);
  /** The columns the new asset will have, with labels (unset: just `text`). */
  readonly importColumns = input<ImportColumnInput[] | null>(null);
  readonly columnMappingChange = output<ImportColumnMapping | null>();
  /** False until the file's columns cover the template's required fields. */
  readonly columnsReadyChange = output<boolean>();
  /** The file whose columns are matched: only once a template is chosen. */
  readonly mappingFile = computed(() =>
    this.mapColumns() && this.contentTemplate() ? this.versionFile() : null
  );

  readonly i18n = I18N;

  onPickFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    // A replacement file stays blocked until its own preview settles (the mapping
    // component stays on screen and only emits when its readiness changes).
    this.columnMappingChange.emit(null);
    if (!file) this.columnsReadyChange.emit(true);
    this.versionFile.set(file);
    input.value = '';
  }

  clearFile(): void {
    this.columnMappingChange.emit(null);
    this.columnsReadyChange.emit(true);
    this.versionFile.set(null);
  }
}
