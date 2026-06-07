import { Component, EventEmitter, Output, effect, inject, input, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
// import { NzInputNumberModule } from 'ng-zorro-antd/input-number'; // Re-enable with reporter ID filter UI
import { NzSelectModule } from 'ng-zorro-antd/select';
import { IssueReportStatus } from '../../models/issues.models';

export interface IssueFiltersPayload {
  status?: IssueReportStatus[];
  reporter_id?: number | null;
}

@Component({
  selector: 'app-issue-filters',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    // NzInputNumberModule,
    NzSelectModule,
    TranslateModule,
  ],
  template: `
    <div class="issue-filters">
      <div class="admin-filters-bar">
        <nz-select
          class="issue-filters__select issue-filters__select--status"
          nzMode="multiple"
          nzAllowClear
          nzShowArrow
          [nzPlaceHolder]="'ADMIN.ISSUES.FILTERS.STATUS' | translate"
          nzSize="default"
          [(ngModel)]="selectedStatuses"
          (ngModelChange)="onStatusChange($event)"
        >
          @for (s of statusOptions; track s) {
            <nz-option [nzValue]="s" [nzLabel]="statusLabel(s)"></nz-option>
          }
        </nz-select>

        <!-- Reporter ID filter hidden for now — uncomment block + TS below when product wants it back -->
        <!--
        <nz-input-number
          class="issue-filters__reporter"
          [(ngModel)]="reporterId"
          [nzMin]="1"
          [nzStep]="1"
          [nzPlaceHolder]="'ADMIN.ISSUES.FILTERS.REPORTER_ID' | translate"
          (ngModelChange)="onReporterChange()"
        />
        -->

        <button nz-button nzType="default" type="button" (click)="clearFilters()">
          {{ 'ADMIN.COMMON.FILTER_CLEAR' | translate }}
        </button>
      </div>
    </div>
  `,
  styleUrl: './issue-filters.component.less',
})
export class IssueFiltersComponent {
  @Output() readonly filtersChange = new EventEmitter<IssueFiltersPayload>();

  /** Raw URL-derived filters (comma-separated `status`, numeric `reporter_id`). */
  readonly initialFilters = input<Record<string, string | number | undefined>>({});

  private readonly translate = inject(TranslateService);

  readonly statusOptions: IssueReportStatus[] = [
    'pending',
    'under_review',
    'resolved',
    'dismissed',
  ];

  selectedStatuses: IssueReportStatus[] = [];
  // reporterId: number | null = null;

  constructor() {
    effect(() => {
      const raw = this.initialFilters() || {};
      untracked(() => this.hydrate(raw));
    });
  }

  statusLabel(s: IssueReportStatus): string {
    return this.translate.instant(`ADMIN.ISSUES.STATUS.${s.toUpperCase()}`);
  }

  private hydrate(raw: Record<string, string | number | undefined>): void {
    const st = raw['status'];
    if (st == null || st === '') {
      this.selectedStatuses = [];
    } else if (Array.isArray(st)) {
      this.selectedStatuses = st as IssueReportStatus[];
    } else {
      this.selectedStatuses = String(st).split(',').filter(Boolean) as IssueReportStatus[];
    }

    // Reporter ID filter (hidden): restore when uncommenting UI
    // const rid = raw['reporter_id'];
    // if (rid == null || rid === '') {
    //   this.reporterId = null;
    // } else {
    //   const n = Number(rid);
    //   this.reporterId = Number.isFinite(n) ? n : null;
    // }
  }

  onStatusChange(values: IssueReportStatus[]): void {
    this.selectedStatuses = values ?? [];
    this.emit();
  }

  // onReporterChange(): void {
  //   this.emit();
  // }

  clearFilters(): void {
    this.selectedStatuses = [];
    // this.reporterId = null;
    this.emit();
  }

  private emit(): void {
    this.filtersChange.emit({
      status: this.selectedStatuses.length ? this.selectedStatuses : undefined,
      // reporter_id: this.reporterId,
    });
  }
}
