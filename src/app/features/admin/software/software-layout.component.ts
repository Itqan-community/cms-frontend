import { Component } from '@angular/core';
import { SectionLayoutComponent } from '../components/section-layout/section-layout.component';
import type { SectionTab } from '../components/section-layout/section-layout.component';

@Component({
  selector: 'app-software-layout',
  standalone: true,
  imports: [SectionLayoutComponent],
  template: `
    <app-section-layout
      title="ADMIN.SOFTWARE.TITLE"
      description="ADMIN.SOFTWARE.DESCRIPTION"
      basePath="/admin/software"
      [tabs]="subTabs"
    />
  `,
})
export class SoftwareLayoutComponent {
  readonly subTabs: SectionTab[] = [
    {
      id: 'resources',
      path: 'resources',
      label: 'ADMIN.SOFTWARE.TAB_RESOURCES',
      icon: 'lucideWrench',
    },
    { id: 'backend', path: 'backend', label: 'ADMIN.SOFTWARE.TAB_BACKEND', icon: 'lucideSettings' },
    {
      id: 'import',
      path: 'import',
      label: 'ADMIN.SOFTWARE.TAB_IMPORT',
      icon: 'lucideDownloadCloud',
    },
  ];
}
