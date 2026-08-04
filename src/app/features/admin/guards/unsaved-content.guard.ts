import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NzModalService } from 'ng-zorro-antd/modal';

/** A component the unsaved-content guard can interrogate and unwind. */
export interface HasUnsavedContent {
  hasUnsavedWork(): boolean;
  /** Discard the server-side draft; resolves when it is safe to leave. */
  discardAndLeave(): Promise<boolean>;
}

/**
 * Blocks leaving the content editor while there are unsaved edits. Confirming
 * discards the server-side draft (so the "no save = changes discarded" rule
 * holds even across refreshes); cancelling keeps the user on the page.
 */
export const unsavedContentGuard: CanDeactivateFn<HasUnsavedContent> = (component) => {
  if (!component?.hasUnsavedWork?.()) {
    return true;
  }

  const modal = inject(NzModalService);
  const translate = inject(TranslateService);
  const dir = translate.currentLang === 'ar' ? 'rtl' : 'ltr';

  return new Promise<boolean>((resolve) => {
    modal.confirm({
      nzTitle: translate.instant('ADMIN.CONTENT_EDITOR.LEAVE.CONFIRM_TITLE'),
      nzContent: translate.instant('ADMIN.CONTENT_EDITOR.LEAVE.CONFIRM_BODY'),
      nzOkText: translate.instant('ADMIN.CONTENT_EDITOR.LEAVE.OK'),
      nzOkDanger: true,
      nzCancelText: translate.instant('ADMIN.CONTENT_EDITOR.LEAVE.CANCEL'),
      nzDirection: dir,
      nzOnOk: () => component.discardAndLeave().then(resolve),
      nzOnCancel: () => resolve(false),
    });
  });
};
