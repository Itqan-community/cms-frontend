import { ChangeDetectionStrategy, Component, OnDestroy, computed, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TranslatePipe } from '@ngx-translate/core';
import type { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams, SuppressKeyboardEventParams } from 'ag-grid-community';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import type { ContentEntry, ContentIssue } from '../../models/asset-content.models';

/** What the grid passes to a row's issue marker. */
export interface IssueMarkerCellParams extends ICellRendererParams<ContentEntry> {
  issuesFor: (row: ContentEntry) => ContentIssue[];
  onOpen: (row: ContentEntry, issues: ContentIssue[]) => void;
}

/** Keys that open a focused marker cell's issues (Space would otherwise select the row). */
const OPEN_KEYS = new Set(['Enter', ' ']);

/** Leaves Enter and Space on the issues column to the marker, which opens its list. */
export function suppressIssueKeys(params: SuppressKeyboardEventParams<ContentEntry>): boolean {
  return !params.editing && OPEN_KEYS.has(params.event.key);
}

/** A row's open issue reports: a warning badge with their count, which lists them on click. */
@Component({
  selector: 'app-issue-marker-cell',
  standalone: true,
  imports: [NgIcon, NzToolTipModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = params();
    @if (p && p.data && issues().length > 0) {
      <button
        type="button"
        tabindex="-1"
        class="issue-marker"
        nz-tooltip
        [nzTooltipTitle]="
          'ADMIN.CONTENT_EDITOR.ISSUES.MARKER' | translate: { count: issues().length }
        "
        [attr.aria-label]="
          'ADMIN.CONTENT_EDITOR.ISSUES.MARKER' | translate: { count: issues().length }
        "
        (click)="p.onOpen(p.data, issues())"
      >
        <ng-icon name="lucideAlertTriangle" />
        <span>{{ issues().length }}</span>
      </button>
    }
  `,
  styles: `
    .issue-marker {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      padding: 0 6px;
      line-height: 20px;
      border: 1px solid var(--color-warning-600, #fa8c16);
      border-radius: 10px;
      background: var(--color-warning-bg, #fff7e6);
      color: var(--color-warning-text, #d46b08);
      font-size: 12px;
      cursor: pointer;
    }
    .issue-marker:focus-visible {
      outline: 2px solid var(--color-warning-text, #d46b08);
      outline-offset: 1px;
    }
  `,
})
export class IssueMarkerCellComponent implements ICellRendererAngularComp, OnDestroy {
  readonly params = signal<IssueMarkerCellParams | null>(null);
  /** The grid focuses the cell, not the button: Enter or Space on the cell opens the list. */
  private cell: HTMLElement | null = null;
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    const p = this.params();
    const issues = this.issues();
    if (!OPEN_KEYS.has(event.key) || !p?.data || issues.length === 0) return;
    event.preventDefault();
    p.onOpen(p.data, issues);
  };
  readonly issues = computed(() => {
    const p = this.params();
    return p?.data ? p.issuesFor(p.data) : [];
  });

  agInit(params: IssueMarkerCellParams): void {
    this.params.set(params);
    this.cell = params.eGridCell ?? null;
    this.cell?.addEventListener('keydown', this.onKeyDown);
  }

  ngOnDestroy(): void {
    this.cell?.removeEventListener('keydown', this.onKeyDown);
  }

  /** A copy, so a refresh after the issues load recomputes the count. */
  refresh(params: IssueMarkerCellParams): boolean {
    this.params.set({ ...params });
    return true;
  }
}
