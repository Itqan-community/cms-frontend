import { CanDeactivateFn } from '@angular/router';
import { TimestampEditorComponent } from './timestamp-editor.component';

export const timestampEditorCanDeactivate: CanDeactivateFn<TimestampEditorComponent> = (
  component
) => component.canDeactivate();
