import { Component } from '@angular/core';
import type { SectionTab } from '../components/section-layout/section-layout.component';
import { SectionLayoutComponent } from '../components/section-layout/section-layout.component';

@Component({
  selector: 'app-mushafs-layout',
  standalone: true,
  imports: [SectionLayoutComponent],
  template: `
    <app-section-layout
      title="المصاحف"
      description="إدارة النص القرآني على ثلاثة مستويات: السور الكاملة، الآيات المقطعة، والكلمات المنفردة"
      basePath="/admin/mushafs"
      [tabs]="subTabs"
    />
  `,
})
export class MushafsLayoutComponent {
  readonly subTabs: SectionTab[] = [
    { id: 'pages', path: 'pages', label: 'الصفحات', icon: 'lucideLayers' },
    { id: 'surahs', path: 'surahs', label: 'السور', icon: 'lucideBookOpen' },
    { id: 'ayahs', path: 'ayahs', label: 'الآيات', icon: 'lucideList' },
    { id: 'words', path: 'words', label: 'الكلمات', icon: 'lucideBookmark' },
  ];
}
