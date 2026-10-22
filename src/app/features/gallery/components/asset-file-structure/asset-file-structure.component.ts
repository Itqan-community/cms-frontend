import { Component, computed, inject, input, model } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzSegmentedModule, type NzSegmentedOption } from 'ng-zorro-antd/segmented';
import { catchError, map, of, switchMap } from 'rxjs';
import { columnLabel } from '../../../admin/utils/column-label.util';
import { localizedLanguageName } from '../../../admin/utils/iso-639.util';
import type { AssetFileStructure } from '../../models/assets.model';
import { AssetsService } from '../../services/assets.service';

/** Categories whose downloads are CSVs with text columns. */
const TEXT_CATEGORIES = new Set(['tafsir', 'translation']);

/** A loaded preview and the language it was loaded for. */
interface LoadedStructure {
  language: string | null;
  file: AssetFileStructure | null;
}

/**
 * "File structure" for a translation / tafsir: the download's format, its
 * columns (key and label) and its first rows, for the selected language. With
 * several languages it offers a switch above the table, shared with the download
 * language. Hidden for other categories and when the language has none.
 */
@Component({
  selector: 'app-asset-file-structure',
  standalone: true,
  imports: [FormsModule, NgIcon, NzSegmentedModule, TranslateModule],
  templateUrl: './asset-file-structure.component.html',
  styleUrl: './asset-file-structure.component.less',
})
export class AssetFileStructureComponent {
  readonly assetId = input.required<number>();
  readonly category = input.required<string>();
  /** The asset's downloadable languages; a switch is shown when there are several. */
  readonly languages = input<string[]>([]);
  readonly language = model<string | null>(null);

  private readonly assetsService = inject(AssetsService);
  private readonly translate = inject(TranslateService);

  private readonly request = computed(() => ({
    id: this.assetId(),
    category: this.category(),
    language: this.language(),
  }));

  private readonly loaded = toSignal<LoadedStructure | null, LoadedStructure | null>(
    toObservable(this.request).pipe(
      // switchMap: a newer language cancels the previous request.
      switchMap(({ id, category, language }) =>
        TEXT_CATEGORIES.has(category)
          ? this.assetsService.getFileStructure(id, language).pipe(
              catchError(() => of(null)),
              map((file): LoadedStructure => ({ language, file }))
            )
          : of<LoadedStructure>({ language, file: null })
      )
    ),
    { initialValue: null as LoadedStructure | null }
  );

  /** The last loaded preview: kept on screen while another language loads.
   *  Null while loading the first one, for other categories, or when unavailable. */
  readonly structure = computed(() => this.loaded()?.file ?? null);
  /** A different language than the one on screen is loading. */
  readonly loading = computed(() => this.loaded()?.language !== this.language());

  readonly languageOptions = computed<NzSegmentedOption[]>(() =>
    this.languages().map((code) => ({
      value: code,
      label: localizedLanguageName(code, this.translate.currentLang || 'en'),
    }))
  );

  /** The label of a header cell that is a text column (the unit columns have none). */
  labelOf(structure: AssetFileStructure, header: string): string | null {
    const column = structure.columns.find((c) => c.key === header);
    if (!column) return null;
    const label = columnLabel(column, this.translate.currentLang);
    return label === column.key ? null : label;
  }
}
