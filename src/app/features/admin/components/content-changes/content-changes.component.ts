import { DatePipe } from '@angular/common';
import { Component, computed, input, linkedSignal, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';

import type { ContentChange } from '../../models/asset-content.models';
import { diffWords, type WordDiff } from '../../utils/word-diff.util';
import { ChangeCompareComponent } from '../change-compare/change-compare.component';

type ChangeType = ContentChange['change_type'];
type ChangeFilter = 'all' | ChangeType;

/** How many change cards render at once; "Show more" reveals the next batch. */
const PAGE_SIZE = 50;
/** One listed change with its word diff (null unless modified). */
interface VisibleChange {
  change: ContentChange;
  words: WordDiff | null;
}

/** Unchanged words kept around each change in `compact` mode. */
const COMPACT_CONTEXT_WORDS = 2;

/**
 * Readable list of content changes for non-technical reviewers: counts per
 * kind (which double as filters), then one card per changed unit showing the
 * added text, the removed text, or a before/after comparison with the exact
 * words that changed highlighted and long unchanged stretches folded away.
 * `compact` (the versions list) stacks before above after and keeps only a
 * couple of words around each change.
 */
@Component({
  selector: 'app-content-changes',
  standalone: true,
  imports: [
    DatePipe,
    NgIcon,
    TranslateModule,
    NzButtonModule,
    NzModalModule,
    ChangeCompareComponent,
  ],
  templateUrl: './content-changes.component.html',
  styleUrl: './content-changes.component.less',
})
export class ContentChangesComponent {
  readonly changes = input.required<ContentChange[]>();
  readonly compact = input(false);

  readonly filters: { key: ChangeFilter; label: string }[] = [
    { key: 'all', label: 'ADMIN.CONTENT_CHANGES.ALL' },
    { key: 'added', label: 'ADMIN.CONTENT_CHANGES.ADDED' },
    { key: 'modified', label: 'ADMIN.CONTENT_CHANGES.MODIFIED' },
    { key: 'removed', label: 'ADMIN.CONTENT_CHANGES.REMOVED' },
  ];

  /** Resets to "all" whenever a new set of changes arrives. */
  readonly filter = linkedSignal<ContentChange[], ChangeFilter>({
    source: this.changes,
    computation: () => 'all',
  });

  readonly counts = computed(() => {
    const counts: Record<ChangeType, number> = { added: 0, modified: 0, removed: 0 };
    for (const c of this.changes()) counts[c.change_type]++;
    return counts;
  });

  readonly filtered = computed(() => {
    const f = this.filter();
    return f === 'all' ? this.changes() : this.changes().filter((c) => c.change_type === f);
  });

  /** Back to the first page whenever the list or the filter changes. */
  readonly limit = linkedSignal(() => {
    this.filtered();
    return PAGE_SIZE;
  });

  readonly visible = computed<VisibleChange[]>(() =>
    this.filtered()
      .slice(0, this.limit())
      .map((change) => ({
        change,
        words:
          change.change_type === 'modified'
            ? diffWords(
                change.old_text ?? '',
                change.new_text ?? '',
                this.compact() ? { contextWords: COMPACT_CONTEXT_WORDS } : {}
              )
            : null,
      }))
  );

  /** The change whose whole text is open in the popup (the list stays folded). */
  readonly fullTextItem = signal<VisibleChange | null>(null);

  readonly remaining = computed(() => this.filtered().length - this.visible().length);

  countFor(key: ChangeFilter): number {
    return key === 'all' ? this.changes().length : this.counts()[key];
  }

  typeLabel(type: ChangeType): string {
    return `ADMIN.CONTENT_CHANGES.${type.toUpperCase()}`;
  }

  /**
   * The review state shown beside a change, or null to show none. Unreviewed is
   * shown only for committed versions (`compact`, the versions list): the edits
   * listed elsewhere are not committed yet, so they cannot have been reviewed.
   */
  showsReview(change: ContentChange): NonNullable<ContentChange['review_state']> | null {
    const state = change.review_state;
    if (state === 'approved' || state === 'commented') return state;
    return this.compact() && state === 'unreviewed' ? state : null;
  }

  setFilter(key: ChangeFilter): void {
    this.filter.set(key);
  }

  openFullText(item: VisibleChange): void {
    this.fullTextItem.set(item);
  }

  closeFullText(): void {
    this.fullTextItem.set(null);
  }

  showMore(): void {
    this.limit.update((n) => n + PAGE_SIZE);
  }
}
