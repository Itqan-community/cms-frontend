import { Component } from '@angular/core';
import type { SectionTab } from '../components/section-layout/section-layout.component';
import { SectionLayoutComponent } from '../components/section-layout/section-layout.component';

@Component({
  selector: 'app-mushafs-layout',
  standalone: true,
  imports: [SectionLayoutComponent],
  template: `
    <app-section-layout
      title="ADMIN.MUSHAFS.TITLE"
      description="ADMIN.MUSHAFS.DESCRIPTION"
      basePath="/admin/mushafs"
      [tabs]="subTabs"
    />
  `,
})
export class MushafsLayoutComponent {
  readonly subTabs: SectionTab[] = [
    { id: 'pages', path: 'pages', label: 'ADMIN.MUSHAFS.TAB_PAGES', icon: 'lucideLayers' },
    { id: 'surahs', path: 'surahs', label: 'ADMIN.MUSHAFS.TAB_SURAHS', icon: 'lucideBookOpen' },
    { id: 'ayahs', path: 'ayahs', label: 'ADMIN.MUSHAFS.TAB_AYAHS', icon: 'lucideList' },
    { id: 'words', path: 'words', label: 'ADMIN.MUSHAFS.TAB_WORDS', icon: 'lucideBookmark' },
  ];
}
