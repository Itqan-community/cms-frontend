import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TranslatePipe } from '@ngx-translate/core';
import type { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import type { ContentEntry, QuranPosition } from '../../models/asset-content.models';

/** What the grid passes to a group row's range cell. */
export interface GroupRangeCellParams extends ICellRendererParams<ContentEntry> {
  /** Word groups name words (`2:255:4`); ayah groups name ayahs (`2:255`). */
  words: boolean;
  /** The source language's draft may change ranges; everyone else reads them. */
  editable: (row: ContentEntry) => boolean;
  orphanLabel: string;
  onRangeChange: (row: ContentEntry, start: QuranPosition, end: QuranPosition) => void;
  /** Grow (1) or shrink (-1) the range's end by one ayah / word. */
  onExtend: (row: ContentEntry, by: 1 | -1) => void;
  onInvalid: () => void;
}

const AYAH_RE = /^(\d+):(\d+)$/;
const WORD_RE = /^(\d+):(\d+):(\d+)$/;

/** `"2:255"` (ayah) or `"2:255:4"` (word) as a position; null when it doesn't read as one. */
export function parsePosition(text: string, words: boolean): QuranPosition | null {
  const match = (words ? WORD_RE : AYAH_RE).exec(text.trim());
  if (!match) return null;
  const [surah, ayah, word] = match.slice(1).map(Number);
  return words ? { surah, ayah, word } : { surah, ayah };
}

export function formatPosition(position: QuranPosition | null | undefined): string {
  if (!position) return '';
  return [position.surah, position.ayah, ...(position.word != null ? [position.word] : [])].join(
    ':'
  );
}

/**
 * A group row's range, edited in place: type a start or end (Enter or leaving the
 * box saves it) and grow / shrink the end one ayah or word at a time. Read-only
 * rows (translations, history) show the label, marked when orphaned.
 */
@Component({
  selector: 'app-group-range-cell',
  standalone: true,
  imports: [NgIcon, NzButtonModule, NzToolTipModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = params();
    @if (p && p.data; as row) {
      @if (canEdit()) {
        <span class="group-range-cell" dir="ltr">
          <input
            #startInput
            class="group-range-cell__input"
            [value]="startText()"
            [attr.aria-label]="'ADMIN.CONTENT_EDITOR.GROUPS.FROM' | translate"
            (keydown.enter)="commit('start', startInput)"
            (keydown.escape)="startInput.value = startText()"
            (blur)="commit('start', startInput)"
          />
          <span class="group-range-cell__arrow">→</span>
          <input
            #endInput
            class="group-range-cell__input"
            [value]="endText()"
            [attr.aria-label]="'ADMIN.CONTENT_EDITOR.GROUPS.TO' | translate"
            (keydown.enter)="commit('end', endInput)"
            (keydown.escape)="endInput.value = endText()"
            (blur)="commit('end', endInput)"
          />
          <button
            nz-button
            nzSize="small"
            type="button"
            nz-tooltip
            [nzTooltipTitle]="'ADMIN.CONTENT_EDITOR.GROUPS.SHRINK' | translate"
            [attr.aria-label]="'ADMIN.CONTENT_EDITOR.GROUPS.SHRINK' | translate"
            [disabled]="isSingle()"
            (click)="p.onExtend(row, -1)"
          >
            <ng-icon name="lucideMinus" />
          </button>
          <button
            nz-button
            nzSize="small"
            type="button"
            nz-tooltip
            [nzTooltipTitle]="'ADMIN.CONTENT_EDITOR.GROUPS.GROW' | translate"
            [attr.aria-label]="'ADMIN.CONTENT_EDITOR.GROUPS.GROW' | translate"
            (click)="p.onExtend(row, 1)"
          >
            <ng-icon name="lucidePlus" />
          </button>
        </span>
      } @else {
        <span dir="ltr">{{ row.label }}</span>
        @if (row.orphaned) {
          <span class="group-range-cell__orphan"> · {{ p.orphanLabel }}</span>
        }
      }
    }
  `,
  styles: `
    .group-range-cell {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .group-range-cell__input {
      width: 72px;
      padding: 0 4px;
      border: 1px solid var(--admin-border-200);
      border-radius: 4px;
      font-variant-numeric: tabular-nums;
    }
    .group-range-cell__arrow {
      color: var(--admin-text-500);
    }
    .group-range-cell__orphan {
      color: var(--admin-text-500);
      font-style: italic;
    }
  `,
})
export class GroupRangeCellComponent implements ICellRendererAngularComp {
  readonly params = signal<GroupRangeCellParams | null>(null);
  readonly canEdit = computed(() => {
    const p = this.params();
    return !!p?.data && p.editable(p.data);
  });
  readonly startText = computed(() => formatPosition(this.params()?.data?.group_from));
  readonly endText = computed(() => formatPosition(this.params()?.data?.group_to));
  readonly isSingle = computed(() => this.startText() === this.endText());

  agInit(params: GroupRangeCellParams): void {
    this.params.set(params);
  }

  refresh(params: GroupRangeCellParams): boolean {
    this.params.set(params);
    return true;
  }

  /** Save a typed start / end when it changed; an unreadable value is reported and undone. */
  commit(which: 'start' | 'end', input: HTMLInputElement): void {
    const p = this.params();
    const row = p?.data;
    if (!p || !row?.group_from || !row.group_to) return;
    const current = which === 'start' ? this.startText() : this.endText();
    if (input.value.trim() === current) return;
    const position = parsePosition(input.value, p.words);
    if (!position) {
      input.value = current;
      p.onInvalid();
      return;
    }
    const start =
      which === 'start' ? position : (parsePosition(this.startText(), p.words) ?? position);
    const end = which === 'end' ? position : (parsePosition(this.endText(), p.words) ?? position);
    p.onRangeChange(row, start, end);
  }
}
