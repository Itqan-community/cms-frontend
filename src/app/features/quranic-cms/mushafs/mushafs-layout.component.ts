import { Component } from '@angular/core';
import { SectionLayoutComponent } from '../components/section-layout/section-layout.component';
import type { SectionTab } from '../components/section-layout/section-layout.component';

@Component({
  selector: 'app-mushafs-layout',
  standalone: true,
  imports: [SectionLayoutComponent],
  template: `
    <app-section-layout
      title="المصاحف"
      description="إدارة المصاحف والنسخ القرآنية"
      basePath="/quranic-cms/mushafs"
      [tabs]="subTabs"
    />
  `,
})
export class MushafsLayoutComponent {
  readonly subTabs: SectionTab[] = [
    { id: 'pages', path: 'pages', label: 'الصفحات' },
    { id: 'words', path: 'words', label: 'الكلمات' },
    { id: 'ayahs', path: 'ayahs', label: 'الايات' },
    { id: 'surahs', path: 'surahs', label: 'السور' },
  ];
}
