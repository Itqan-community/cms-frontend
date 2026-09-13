import { CanDeactivateFn } from '@angular/router';

/** A component the unsaved-content guard can interrogate and unwind. */
export interface HasUnsavedContent {
  hasUnsavedWork(): boolean;
  /** Flush pending edits and allow leaving, keeping the server-side draft. */
  keepDraftOnLeave(): Promise<boolean>;
}

/**
 * Ensures pending edits are flushed to the draft before navigating away. Edits
 * autosave to a server-side draft, so leaving keeps the draft (the user can
 * resume later, or explicitly Discard it); this guard only makes sure the last
 * in-flight edit is persisted first.
 */
export const unsavedContentGuard: CanDeactivateFn<HasUnsavedContent> = (component) => {
  if (!component?.hasUnsavedWork?.()) {
    return true;
  }
  return component.keepDraftOnLeave();
};
