import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, from, map, of, switchMap } from 'rxjs';
import type { FontPreview } from '../../models/assets.model';
import { AssetsService } from '../../services/assets.service';

/** A loaded preview and the family its font was registered under. */
interface LoadedFont {
  preview: FontPreview;
  family: string;
}

let nextFamily = 0;

/**
 * "Font preview" for a font asset: Al-Fatiha set in the font, for the selected
 * language. Hidden while loading, when the font has no file, and when the
 * browser can't load it.
 */
@Component({
  selector: 'app-asset-font-preview',
  standalone: true,
  imports: [NgIcon, TranslateModule],
  templateUrl: './asset-font-preview.component.html',
  styleUrl: './asset-font-preview.component.less',
})
export class AssetFontPreviewComponent {
  readonly assetId = input.required<number>();
  readonly language = input<string | null>(null);

  private readonly assetsService = inject(AssetsService);
  private readonly fonts = inject(DOCUMENT).fonts;
  private readonly faces: FontFace[] = [];

  private readonly request = computed(() => ({ id: this.assetId(), language: this.language() }));

  readonly loaded = toSignal<LoadedFont | null, LoadedFont | null>(
    toObservable(this.request).pipe(
      // switchMap: a newer language cancels the previous request.
      switchMap(({ id, language }) =>
        this.assetsService.getFontPreview(id, language).pipe(
          switchMap((preview) => this.loadFont(preview)),
          catchError(() => of(null))
        )
      )
    ),
    { initialValue: null as LoadedFont | null }
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => this.faces.forEach((face) => this.fonts.delete(face)));
  }

  /** An ayah number in Arabic-Indic digits, which Quran fonts draw as the ayah marker. */
  ayahNumber(ayah: number): string {
    return ayah.toLocaleString('ar-EG');
  }

  private loadFont(preview: FontPreview) {
    const family = `asset-font-preview-${++nextFamily}`;
    const face = new FontFace(family, `url("${preview.font_url}") format("${preview.format}")`);
    return from(face.load()).pipe(
      map((): LoadedFont => {
        this.fonts.add(face);
        this.faces.push(face);
        return { preview, family };
      }),
      catchError((err) => {
        console.warn('[AssetFontPreview] font failed to load', preview.file_name, err);
        return of(null);
      })
    );
  }
}
