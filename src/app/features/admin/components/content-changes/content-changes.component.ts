import { Component, computed, input, linkedSignal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

import type { ContentChange } from '../../models/asset-content.models';
import { diffWords } from '../../utils/word-diff.util';

type ChangeType = ContentChange['change_type'];
type ChangeFilter = 'all' | ChangeType;

/** How many change cards render at once; "Show more" reveals the next batch. */
const PAGE_SIZE = 50;

/**
 * Readable list of content changes for non-technical reviewers: counts per
 * kind (which double as filters), then one card per changed unit showing the
 * added text, the removed text, or a before/after comparison with the exact
 * words that changed highlighted.
 */
@Component({
  selector: 'app-content-changes',
  standalone: true,
  imports: [TranslateModule, NzButtonModule],
  templateUrl: './content-changes.component.html',
  styleUrl: './content-changes.component.less',
})
export class ContentChangesComponent {
  readonly changes = input.required<ContentChange[]>();

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

  readonly visible = computed(() =>
    this.filtered()
      .slice(0, this.limit())
      .map((change) => ({
        change,
        words:
          change.change_type === 'modified'
            ? diffWords(change.old_text ?? '', change.new_text ?? '')
            : null,
      }))
  );

  readonly remaining = computed(() => this.filtered().length - this.visible().length);

  countFor(key: ChangeFilter): number {
    return key === 'all' ? this.changes().length : this.counts()[key];
  }

  typeLabel(type: ChangeType): string {
    return `ADMIN.CONTENT_CHANGES.${type.toUpperCase()}`;
  }

  setFilter(key: ChangeFilter): void {
    this.filter.set(key);
  }

  showMore(): void {
    this.limit.update((n) => n + PAGE_SIZE);
  }
}
