import { Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, of, switchMap } from 'rxjs';
import type { AssetFileStructure } from '../../models/assets.model';
import { AssetsService } from '../../services/assets.service';

/** Categories whose downloads are CSVs with text columns. */
const TEXT_CATEGORIES = new Set(['tafsir', 'translation']);

/**
 * "File structure" for a translation / tafsir: the download's format, its
 * columns (key and label) and its first rows, for the selected download
 * language. Hidden for other categories and when the language has none.
 */
@Component({
  selector: 'app-asset-file-structure',
  standalone: true,
  imports: [NgIcon, TranslateModule],
  templateUrl: './asset-file-structure.component.html',
  styleUrl: './asset-file-structure.component.less',
})
export class AssetFileStructureComponent {
  readonly assetId = input.required<number>();
  readonly category = input.required<string>();
  readonly language = input<string | null>(null);

  private readonly assetsService = inject(AssetsService);
  private readonly translate = inject(TranslateService);

  private readonly request = computed(() => ({
    id: this.assetId(),
    category: this.category(),
    language: this.language(),
  }));

  /** Null while loading, for other categories, or when unavailable (404). */
  readonly structure = toSignal(
    toObservable(this.request).pipe(
      // switchMap: a newer language cancels the previous request.
      switchMap(({ id, category, language }) =>
        TEXT_CATEGORIES.has(category)
          ? this.assetsService.getFileStructure(id, language).pipe(catchError(() => of(null)))
          : of(null)
      )
    ),
    { initialValue: null as AssetFileStructure | null }
  );

  /** The label of a header cell that is a text column (the unit columns have none). */
  labelOf(structure: AssetFileStructure, header: string): string | null {
    const column = structure.columns.find((c) => c.key === header);
    if (!column) return null;
    const [first, second] =
      this.translate.currentLang === 'ar'
        ? [column.label_ar, column.label_en]
        : [column.label_en, column.label_ar];
    return first || second || null;
  }
}
