import { Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import type { WordDiff } from '../../utils/word-diff.util';

/**
 * Before/after comparison of one changed text: the exact words that changed are
 * highlighted, and unless `expanded`, long unchanged stretches fold into "…".
 * `stacked` puts after under before with each label beside its text; otherwise
 * the two sides sit next to each other. The caller computes `words` (it also
 * decides whether to offer a "show full text" toggle from `words.folded`).
 */
@Component({
  selector: 'app-change-compare',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './change-compare.component.html',
  styleUrl: './change-compare.component.less',
})
export class ChangeCompareComponent {
  readonly before = input.required<string>();
  readonly after = input.required<string>();
  /** Word diff of `before` → `after`; `null` shows both texts plainly. */
  readonly words = input<WordDiff | null>(null);
  readonly stacked = input(false);
  readonly expanded = input(false);
}
