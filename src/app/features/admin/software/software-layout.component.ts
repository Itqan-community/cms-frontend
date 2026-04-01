import { Component } from '@angular/core';
import { SectionLayoutComponent } from '../components/section-layout/section-layout.component';
import type { SectionTab } from '../components/section-layout/section-layout.component';

@Component({
  selector: 'app-software-layout',
  standalone: true,
  imports: [SectionLayoutComponent],
  template: `
    <app-section-layout
      title="البرمجيات"
      description="موارد المطورين والواجهات البرمجية"
      basePath="/admin/software"
      [tabs]="subTabs"
    />
  `,
})
export class SoftwareLayoutComponent {
  readonly subTabs: SectionTab[] = [
    { id: 'resources', path: 'resources', label: 'موارد المطورين' },
    { id: 'backend', path: 'backend', label: 'Backend' },
    { id: 'import', path: 'import', label: 'إستيراد البيانات' },
  ];
}
