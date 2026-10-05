import { Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { clipSegments, clipText } from '../../utils/text-preview.util';
import type { WordDiff, WordDiffSegment } from '../../utils/word-diff.util';

/** One side as rendered: diff segments, or plain text when there is no diff. */
interface SideView {
  segments: WordDiffSegment[] | null;
  text: string;
  clipped: boolean;
}

/**
 * Before/after comparison of one changed text: the exact words that changed are
 * highlighted. Unless `expanded`, long unchanged stretches fold into "…" and each
 * side is cut off after a few lines (`PREVIEW_CHARS`) — the caller offers the full
 * text (e.g. a popup; see `isPreviewCut`). `stacked` puts after under before with
 * each label beside its text; otherwise the two sides sit next to each other.
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

  readonly beforeView = computed(() =>
    this.side(this.before(), this.words()?.before, this.words()?.folded?.before)
  );
  readonly afterView = computed(() =>
    this.side(this.after(), this.words()?.after, this.words()?.folded?.after)
  );

  private side(
    text: string,
    full: WordDiffSegment[] | undefined,
    folded: WordDiffSegment[] | undefined
  ): SideView {
    const expanded = this.expanded();
    if (full) {
      const segments = expanded ? full : (folded ?? full);
      return expanded
        ? { segments, text, clipped: false }
        : { ...clipSegments(segments), text, clipped: false };
    }
    return expanded
      ? { segments: null, text, clipped: false }
      : { segments: null, ...clipText(text) };
  }
}
