import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TranslatePipe } from '@ngx-translate/core';
import type { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import type { ContentEntry, ContentIssue } from '../../models/asset-content.models';

/** What the grid passes to a row's issue marker. */
export interface IssueMarkerCellParams extends ICellRendererParams<ContentEntry> {
  issuesFor: (row: ContentEntry) => ContentIssue[];
  onOpen: (row: ContentEntry, issues: ContentIssue[]) => void;
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
export class IssueMarkerCellComponent implements ICellRendererAngularComp {
  readonly params = signal<IssueMarkerCellParams | null>(null);
  readonly issues = computed(() => {
    const p = this.params();
    return p?.data ? p.issuesFor(p.data) : [];
  });

  agInit(params: IssueMarkerCellParams): void {
    this.params.set(params);
  }

  /** A copy, so a refresh after the issues load recomputes the count. */
  refresh(params: IssueMarkerCellParams): boolean {
    this.params.set({ ...params });
    return true;
  }
}
