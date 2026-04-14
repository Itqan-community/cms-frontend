import { CanDeactivateFn } from '@angular/router';
import { RecitationDetailComponent } from './recitation-detail.component';

export const recitationDetailCanDeactivate: CanDeactivateFn<RecitationDetailComponent> = (
  component
) => component.canDeactivate();
