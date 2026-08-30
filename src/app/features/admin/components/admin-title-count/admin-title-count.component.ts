import { Component, input } from '@angular/core';

@Component({
  selector: 'app-admin-title-count',
  standalone: true,
  template: `<span class="admin-title-count">({{ count() }})</span>`,
  styleUrl: './admin-title-count.component.less',
})
export class AdminTitleCountComponent {
  readonly count = input.required<number>();
}
