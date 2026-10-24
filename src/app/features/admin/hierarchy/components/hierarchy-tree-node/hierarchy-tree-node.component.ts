import { Component, computed, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { HierarchyNodeRow } from '../../models/hierarchy.models';

/** Inline-start padding of a tree row, in pixels, for its depth (1 = surah). */
export function hierarchyIndent(depth: number): number {
  return 12 + (depth - 1) * 24;
}

/** `m:ss.mmm`, e.g. `0:01.230`. */
export function formatTimingMs(ms: number): string {
  const total = Math.max(0, Math.round(ms));
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

/** One `treeitem` of the hierarchy tree; the manager owns focus, loading and navigation. */
@Component({
  selector: 'app-hierarchy-tree-node',
  standalone: true,
  imports: [NgIcon, TranslateModule, NzTagModule],
  templateUrl: './hierarchy-tree-node.component.html',
  styleUrl: './hierarchy-tree-node.component.less',
  host: {
    class: 'hierarchy-tree-node',
    role: 'treeitem',
    '[id]': 'row().id',
    '[class.hierarchy-tree-node--active]': 'active()',
    '[class.hierarchy-tree-node--leaf]': '!row().expandable',
    '[style.padding-inline-start.px]': 'indent()',
    '[attr.aria-level]': 'row().depth',
    '[attr.aria-setsize]': 'row().setSize',
    '[attr.aria-posinset]': 'row().posInSet',
    '[attr.aria-expanded]': 'row().expandable ? row().expanded : null',
    '[attr.aria-selected]': 'active()',
    '(click)': 'pick.emit()',
  },
})
export class HierarchyTreeNodeComponent {
  readonly row = input.required<HierarchyNodeRow>();
  readonly active = input(false);
  readonly pick = output<void>();

  readonly indent = computed(() => hierarchyIndent(this.row().depth));

  readonly surah = computed(() => {
    const node = this.row().node;
    return node.level === 'surah' ? node.data : null;
  });

  readonly ayah = computed(() => {
    const node = this.row().node;
    return node.level === 'ayah' ? node.data : null;
  });

  readonly word = computed(() => {
    const node = this.row().node;
    return node.level === 'word' ? node.data : null;
  });

  readonly letter = computed(() => {
    const node = this.row().node;
    return node.level === 'letter' ? node.data : null;
  });

  /** Word segment as `start - end`, or null when the dataset has no timing for this word. */
  readonly timing = computed(() => {
    const word = this.word();
    if (word?.start_ms == null || word.end_ms == null) {
      return null;
    }
    return { start: formatTimingMs(word.start_ms), end: formatTimingMs(word.end_ms) };
  });

  /** Code points of a letter and its marks, so diacritics can be verified one by one. */
  readonly codePoints = computed(() => {
    const letter = this.letter();
    if (!letter) {
      return '';
    }
    return Array.from(letter.text)
      .map((char) => `U+${(char.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(4, '0')}`)
      .join(' ');
  });
}
