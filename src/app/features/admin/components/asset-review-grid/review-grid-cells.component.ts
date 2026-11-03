import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, type Signal, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import type { ICellRendererAngularComp, IFloatingFilterAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams, IFloatingFilterParams, TextFilter } from 'ag-grid-community';
import { NzButtonModule } from 'ng-zorro-antd/button';
import type { ReviewChange } from '../../models/asset-review.models';
import type { WordDiff } from '../../utils/word-diff.util';
import { ChangeCompareComponent } from '../change-compare/change-compare.component';

/** What a review row compares: the reviewed text against what it replaces. */
export interface RowCompare {
  before: string;
  after: string;
  words: WordDiff | null;
  /** Shown cut short inline: offer "Show full text". */
  cut: boolean;
}

export type ReviewActionType = 'approve' | 'comment' | 'unreview';

/** The grid component, as its cells see it (the grid's `context`). */
export interface ReviewGridContext {
  compare: Signal<ReadonlyMap<number, RowCompare>>;
  savingAction: Signal<{ id: number; action: ReviewActionType } | null>;
  openFullText(row: ReviewChange): void;
  approve(row: ReviewChange): void;
  openComment(row: ReviewChange): void;
  unreview(row: ReviewChange): void;
}

type ReviewCellParams = ICellRendererParams<ReviewChange, unknown, ReviewGridContext>;

/** Shared `agInit` / `refresh` of the review cells: the row and the grid context. */
abstract class ReviewCell implements ICellRendererAngularComp {
  readonly params = signal<ReviewCellParams | null>(null);

  agInit(params: ReviewCellParams): void {
    this.params.set(params);
  }

  refresh(params: ReviewCellParams): boolean {
    this.params.set(params);
    return true;
  }
}

/** The before/after comparison, with "Show full text" when it is cut short. */
@Component({
  selector: 'app-review-change-cell',
  standalone: true,
  imports: [ChangeCompareComponent, NzButtonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = params();
    @if (p?.data; as row) {
      @if (p!.context.compare().get(row.id); as cmp) {
        <div class="asset-review-grid__change">
          <app-change-compare
            [before]="cmp.before"
            [after]="cmp.after"
            [words]="cmp.words"
            [stacked]="true"
          />
          @if (cmp.cut) {
            <button
              nz-button
              nzType="link"
              nzSize="small"
              type="button"
              class="asset-review-grid__full-text"
              (click)="p!.context.openFullText(row)"
            >
              {{ 'ADMIN.CONTENT_CHANGES.SHOW_FULL_TEXT' | translate }}
            </button>
          }
        </div>
      }
    }
  `,
})
export class ReviewChangeCellComponent extends ReviewCell {}

/** The review state badge, and who reviewed it when. */
@Component({
  selector: 'app-review-state-cell',
  standalone: true,
  imports: [DatePipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (params()?.data; as row) {
      <span
        class="asset-review-grid__state"
        [class.asset-review-grid__state--approved]="row.review_state === 'approved'"
        [class.asset-review-grid__state--commented]="row.review_state === 'commented'"
      >
        {{ 'ADMIN.REVIEW.STATE.' + row.review_state.toUpperCase() | translate }}
      </span>
      @if (row.reviewed_by) {
        <span class="asset-review-grid__reviewer">
          {{ row.reviewed_by }}
          @if (row.reviewed_at) {
            · {{ row.reviewed_at | date: 'short' }}
          }
        </span>
      }
    }
  `,
})
export class ReviewStateCellComponent extends ReviewCell {}

/** Approve / comment / unreview buttons of one row. */
@Component({
  selector: 'app-review-actions-cell',
  standalone: true,
  imports: [NzButtonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = params();
    @if (p?.data; as row) {
      @let saving = p!.context.savingAction();
      <div class="asset-review-grid__actions">
        <button
          nz-button
          nzSize="small"
          type="button"
          [nzType]="row.review_state === 'approved' ? 'primary' : 'default'"
          [nzLoading]="saving?.id === row.id && saving?.action === 'approve'"
          [disabled]="saving?.id === row.id"
          (click)="p!.context.approve(row)"
        >
          {{ 'ADMIN.REVIEW.ACTION.APPROVE' | translate }}
        </button>
        <button
          nz-button
          nzSize="small"
          type="button"
          [nzType]="row.review_state === 'commented' ? 'primary' : 'default'"
          [disabled]="saving?.id === row.id"
          (click)="p!.context.openComment(row)"
        >
          {{ 'ADMIN.REVIEW.ACTION.COMMENT' | translate }}
        </button>
        @if (row.review_state !== 'unreviewed') {
          <button
            nz-button
            nzSize="small"
            nzType="link"
            type="button"
            [nzLoading]="saving?.id === row.id && saving?.action === 'unreview'"
            [disabled]="saving?.id === row.id"
            (click)="p!.context.unreview(row)"
          >
            {{ 'ADMIN.REVIEW.ACTION.UNREVIEW' | translate }}
          </button>
        }
      </div>
    }
  `,
})
export class ReviewActionsCellComponent extends ReviewCell {}

export interface FilterOption {
  value: string;
  label: string;
}

/** What a column passes its options dropdown (`floatingFilterComponentParams`). */
export interface OptionsFloatingFilterParams extends IFloatingFilterParams<TextFilter> {
  options: FilterOption[];
  /** The first, "everything" entry. */
  allLabel: string;
}

/**
 * A dropdown floating filter over a text column whose values are a fixed set (a
 * change type, a column key). Community edition has no Set Filter, so it drives
 * the column's text filter with `equals`, which the backend matches exactly.
 */
@Component({
  selector: 'app-options-floating-filter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <select
      class="asset-review-grid__options-filter"
      [value]="selected()"
      (change)="onChange($any($event.target).value)"
    >
      <option value="">{{ params()?.allLabel }}</option>
      @for (opt of params()?.options ?? []; track opt.value) {
        <option [value]="opt.value" [selected]="opt.value === selected()">{{ opt.label }}</option>
      }
    </select>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .asset-review-grid__options-filter {
        width: 100%;
        min-height: 24px;
        border: 1px solid var(--ag-border-color, #ccc);
        border-radius: 4px;
        background: transparent;
        font: inherit;
        cursor: pointer;
      }
    `,
  ],
})
export class OptionsFloatingFilterComponent implements IFloatingFilterAngularComp {
  readonly params = signal<OptionsFloatingFilterParams | null>(null);
  readonly selected = signal('');

  agInit(params: OptionsFloatingFilterParams): void {
    this.params.set(params);
  }

  refresh(params: OptionsFloatingFilterParams): void {
    this.params.set(params);
  }

  /** Sync the dropdown when the filter model changes elsewhere (e.g. "Clear filters"). */
  onParentModelChanged(model: { filter?: string | null } | null): void {
    this.selected.set(model?.filter ?? '');
  }

  onChange(value: string): void {
    this.selected.set(value);
    this.params()?.parentFilterInstance((instance) => {
      instance.onFloatingFilterChanged(value ? 'equals' : null, value || null);
    });
  }
}
