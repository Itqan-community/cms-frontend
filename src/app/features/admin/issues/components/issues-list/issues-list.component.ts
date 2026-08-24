import { DatePipe, UpperCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { PORTAL_PERMISSIONS } from '../../../constants/portal-permission.constants';
import { AdminListBase } from '../../../utils/admin-list-base';
import {
  IssueFiltersComponent,
  IssueFiltersPayload,
} from '../issue-filters/issue-filters.component';
import {
  IssueReportOut,
  IssueReportStatus,
  IssueReportUrlFilters,
} from '../../models/issues.models';
import { IssuesService } from '../../services/issues.service';

@Component({
  selector: 'app-issues-list',
  standalone: true,
  imports: [
    DatePipe,
    UpperCasePipe,
    RouterLink,
    NgIcon,
    NzAlertModule,
    NzButtonModule,
    NzPaginationModule,
    NzSpinModule,
    NzTableModule,
    NzTagModule,
    NzToolTipModule,
    TranslateModule,
    IssueFiltersComponent,
  ],
  templateUrl: './issues-list.component.html',
  styleUrl: './issues-list.component.less',
})
export class IssuesListComponent extends AdminListBase<IssueReportOut, IssueReportUrlFilters> {
  private readonly issuesService = inject(IssuesService);

  /** Placeholder until backend seeds portal_*_issue_report permissions. */
  readonly canCreateIssue = computed(() => {
    void PORTAL_PERMISSIONS.PORTAL_CREATE_ISSUE_REPORT;
    // TODO(backend-permissions): inject AdminAuthService and check PORTAL_CREATE_ISSUE_REPORT
    return true;
  });

  readonly canUpdateIssue = computed(() => {
    void PORTAL_PERMISSIONS.PORTAL_UPDATE_ISSUE_REPORT;
    // TODO(backend-permissions): inject AdminAuthService and check PORTAL_UPDATE_ISSUE_REPORT
    return true;
  });

  readonly loadFailed = signal(false);

  readonly issuesTableStorageKey = 'admin-list-issues';

  constructor() {
    super();
    this.initList(this.issuesTableStorageKey);
  }

  onIssueFiltersChange(filters: IssueFiltersPayload): void {
    const statusParam = filters.status?.length ? filters.status.join(',') : null;
    const rid =
      filters.reporter_id != null && Number.isFinite(filters.reporter_id)
        ? filters.reporter_id
        : null;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: null,
        status: statusParam,
        reporter_id: rid,
        page_size: this.pageSize() !== 10 ? this.pageSize() : null,
        ordering: this.ordering || null,
      },
      queryParamsHandling: 'merge',
    });
  }

  load(): void {
    this.loading.set(true);
    this.loadFailed.set(false);

    const status = this.parseStatusesFromActiveFilters();
    const reporterRaw = this.activeFilters['reporter_id'];
    const reporterId = reporterRaw != null && reporterRaw !== '' ? Number(reporterRaw) : undefined;
    const reporter_id = reporterId != null && Number.isFinite(reporterId) ? reporterId : null;

    this.issuesService
      .list({
        page: this.page(),
        page_size: this.pageSize(),
        ordering: this.ordering ?? undefined,
        status: status,
        reporter_id,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.results);
          this.total.set(res.count);
          this.loading.set(false);
        },
        error: () => {
          this.items.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.loadFailed.set(true);
        },
      });
  }

  statusTagColor(status: IssueReportStatus): string {
    switch (status) {
      case 'pending':
        return 'gold';
      case 'under_review':
        return 'processing';
      case 'resolved':
        return 'success';
      case 'dismissed':
        return 'default';
      default:
        return 'default';
    }
  }

  truncate(text: string | null | undefined, max = 120): string {
    if (text == null || text === '') {
      return this.translate.instant('COMMON.EM_DASH');
    }
    const t = text.trim();
    if (t.length <= max) {
      return t;
    }
    return `${t.slice(0, max)}…`;
  }

  private parseStatusesFromActiveFilters(): IssueReportStatus[] | undefined {
    const raw = this.activeFilters['status'];
    if (raw == null || raw === '') {
      return undefined;
    }
    const parts = Array.isArray(raw)
      ? raw.flatMap((x) => String(x).split(','))
      : String(raw).split(',');
    const cleaned = parts.map((s) => s.trim()).filter(Boolean) as IssueReportStatus[];
    return cleaned.length ? cleaned : undefined;
  }
}
