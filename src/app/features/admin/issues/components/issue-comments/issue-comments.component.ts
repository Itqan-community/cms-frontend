import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { resolveApiErrorMessage } from '../../../../../shared/utils/api-error-resolver.util';
import { IssueReportComment } from '../../models/issues.models';
import { IssuesService } from '../../services/issues.service';

/** Matches the backend's comment limit. */
export const ISSUE_COMMENT_MAX_LENGTH = 2000;

/**
 * An issue report's comment thread. Publisher members reach the reporter here: each comment is
 * emailed to them by the backend, so the reporter's address stays hidden.
 */
@Component({
  selector: 'app-issue-comments',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    NgIcon,
    NzAlertModule,
    NzButtonModule,
    NzInputModule,
    NzSkeletonModule,
    NzTagModule,
    TranslateModule,
  ],
  templateUrl: './issue-comments.component.html',
  styleUrl: './issue-comments.component.less',
})
export class IssueCommentsComponent implements OnInit {
  private readonly issuesService = inject(IssuesService);
  private readonly message = inject(NzMessageService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly issueId = input.required<number>();
  /** Whether the viewer may post; the thread is shown either way. */
  readonly canComment = input(true);

  readonly maxLength = ISSUE_COMMENT_MAX_LENGTH;
  readonly comments = signal<IssueReportComment[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly sending = signal(false);
  readonly draft = signal('');
  readonly canSend = computed(() => !this.sending() && this.draft().trim().length > 0);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.issuesService
      .listComments(this.issueId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comments) => {
          this.comments.set(comments);
          this.loading.set(false);
        },
        error: (err) => {
          this.loadError.set(
            resolveApiErrorMessage(
              err,
              { fallbackKey: 'ADMIN.ISSUES.COMMENTS.LOAD_ERROR' },
              this.translate
            )
          );
          this.loading.set(false);
        },
      });
  }

  send(): void {
    const body = this.draft().trim();
    if (!body || this.sending()) {
      return;
    }
    this.sending.set(true);
    this.issuesService
      .addComment(this.issueId(), { body })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (comment) => {
          this.comments.update((list) => [...list, comment]);
          this.draft.set('');
          this.sending.set(false);
          this.message.success(this.translate.instant('ADMIN.ISSUES.COMMENTS.SENT'));
        },
        error: (err) => {
          this.sending.set(false);
          this.message.error(
            resolveApiErrorMessage(
              err,
              { fallbackKey: 'ADMIN.ISSUES.COMMENTS.SEND_ERROR' },
              this.translate
            )
          );
        },
      });
  }
}
