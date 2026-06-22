import { Component, computed, input, output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Ayah, Word } from '../../models/mushaf.model';
import { toArabicDigits } from '../../utils/arabic-digits.util';
import { WordChipComponent } from '../word-chip/word-chip.component';

/**
 * Renders a single ayah as a row of interactive words followed by an
 * ayah-number marker. Reused by the full-sura page and the ayah-focus page.
 * When `markerLink` is provided, the ayah-number marker becomes a link to that
 * route (e.g. the single-ayah focus view).
 */
@Component({
  selector: 'app-ayah-view',
  standalone: true,
  imports: [WordChipComponent, RouterModule],
  templateUrl: './ayah-view.component.html',
  styleUrl: './ayah-view.component.less',
})
export class AyahViewComponent {
  ayah = input.required<Ayah>();
  /** Optional routerLink for the ayah-number marker. */
  markerLink = input<unknown[] | null>(null);
  /** The globally-selected word id (owned by the parent page), or null. */
  selectedWordId = input<number | null>(null);

  wordSelected = output<Word>();

  protected readonly markerLabel = computed(() => toArabicDigits(this.ayah().number_in_sura));

  protected onWordClick(word: Word): void {
    this.wordSelected.emit(word);
  }
}
