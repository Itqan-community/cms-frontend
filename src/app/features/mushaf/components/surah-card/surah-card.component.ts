import { Component, computed, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { MushafSurahMeta } from '../../models/mushaf.model';
import { toArabicDigits } from '../../utils/arabic-digits.util';

/**
 * A single surah tile in the mushaf index — number, Arabic name and ayah count.
 * Links to the full-surah view for the active mushaf edition.
 */
@Component({
  selector: 'app-surah-card',
  standalone: true,
  imports: [RouterModule, TranslateModule],
  templateUrl: './surah-card.component.html',
  styleUrl: './surah-card.component.less',
})
export class SurahCardComponent {
  surah = input.required<MushafSurahMeta>();
  /** Active mushaf edition slug, carried into the link as `?mushaf=`. */
  mushafSlug = input.required<string>();

  protected readonly numberLabel = computed(() => toArabicDigits(this.surah().number));
  protected readonly ayahCountLabel = computed(() => toArabicDigits(this.surah().ayahCount));
}
