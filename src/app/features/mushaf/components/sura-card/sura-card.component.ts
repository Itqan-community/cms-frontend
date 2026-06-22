import { Component, computed, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Sura } from '../../models/mushaf.model';
import { toArabicDigits } from '../../utils/arabic-digits.util';

/**
 * A single sura tile in the mushaf index — number, Arabic name, ayah count and
 * revelation-type badge. Links to the full-sura view.
 */
@Component({
  selector: 'app-sura-card',
  standalone: true,
  imports: [RouterModule, TranslateModule],
  templateUrl: './sura-card.component.html',
  styleUrl: './sura-card.component.less',
})
export class SuraCardComponent {
  sura = input.required<Sura>();

  protected readonly numberLabel = computed(() => toArabicDigits(this.sura().id));
  protected readonly ayahCountLabel = computed(() => toArabicDigits(this.sura().ayas_count));
  protected readonly isMeccan = computed(() => this.sura().revelation_type === 'Meccan');
}
