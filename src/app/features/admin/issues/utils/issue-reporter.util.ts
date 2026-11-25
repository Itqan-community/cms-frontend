import { TranslateService } from '@ngx-translate/core';
import { IssueReportReporter } from '../models/issues.models';

/**
 * How the reporter is shown: their name, else their email (staff only; the backend hides it
 * from publisher members), else "Reporter #id".
 */
export function reporterLabel(reporter: IssueReportReporter, translate: TranslateService): string {
  return (
    reporter.name?.trim() ||
    reporter.email ||
    translate.instant('ADMIN.ISSUES.DETAIL.REPORTER_FALLBACK', { id: reporter.id })
  );
}
