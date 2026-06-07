import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { PORTAL_PERMISSIONS } from '../../../constants/portal-permission.constants';
import { IssueReportOut, IssueReportStatus } from '../../models/issues.models';
import { IssuesService } from '../../services/issues.service';

@Component({
  selector: 'app-issue-detail',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    NgIcon,
    NzModalModule,
    NzButtonModule,
    NzSkeletonModule,
    NzTagModule,
    TranslateModule,
  ],
  templateUrl: './issue-detail.component.html',
  styleUrl: './issue-detail.component.less',
})
export class IssueDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly issuesService = inject(IssuesService);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly translate = inject(TranslateService);

  readonly issue = signal<IssueReportOut | null>(null);
  readonly loading = signal(true);

  /** Placeholder until backend seeds portal_*_issue_report permissions. */
  readonly canUpdateIssue = computed(() => {
    void PORTAL_PERMISSIONS.PORTAL_UPDATE_ISSUE_REPORT;
    // TODO(backend-permissions): inject AdminAuthService; return hasPermission(PORTAL_UPDATE_ISSUE_REPORT)
    return true;
  });

  readonly canDeleteIssue = computed(() => {
    void PORTAL_PERMISSIONS.PORTAL_DELETE_ISSUE_REPORT;
    // TODO(backend-permissions): inject AdminAuthService; return hasPermission(PORTAL_DELETE_ISSUE_REPORT)
    return true;
  });

  private issueId!: number;

  ngOnInit(): void {
    const raw = this.route.snapshot.params['id'];
    this.issueId = Number(raw);
    if (!Number.isFinite(this.issueId)) {
      this.loading.set(false);
      return;
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.issuesService.get(this.issueId).subscribe({
      next: (data) => {
        this.issue.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.issue.set(null);
        this.loading.set(false);
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

  onEdit(): void {
    void this.router.navigate(['/admin/issues', this.issueId, 'edit']);
  }

  onDelete(): void {
    const issue = this.issue();
    const label = issue?.asset_name ?? this.translate.instant('ADMIN.ISSUES.DELETE.DEFAULT_LABEL');
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.ISSUES.DELETE.CONFIRM_TITLE'),
      nzContent: this.translate.instant('ADMIN.ISSUES.DELETE.CONFIRM_BODY', { name: label }),
      nzOkText: this.translate.instant('ADMIN.ISSUES.DELETE.OK'),
      nzOkType: 'primary',
      nzOkDanger: true,
      nzCancelText: this.translate.instant('ADMIN.ISSUES.DELETE.CANCEL'),
      nzDirection: this.translate.currentLang === 'ar' ? 'rtl' : 'ltr',
      nzOnOk: () =>
        this.issuesService.delete(this.issueId).subscribe({
          next: () => {
            this.message.success(this.translate.instant('ADMIN.ISSUES.MESSAGES.DELETE_SUCCESS'));
            void this.router.navigate(['/admin/issues']);
          },
          error: () => {
            this.message.error(this.translate.instant('ADMIN.ISSUES.MESSAGES.DELETE_ERROR'));
          },
        }),
    });
  }
}
