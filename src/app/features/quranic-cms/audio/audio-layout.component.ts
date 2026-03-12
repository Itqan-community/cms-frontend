import { Component } from '@angular/core';
import { SectionLayoutComponent } from '../components/section-layout/section-layout.component';

@Component({
  selector: 'app-audio-layout',
  standalone: true,
  imports: [SectionLayoutComponent],
  template: `
    <app-section-layout
      title="الصوتيات"
      description="إدارة القراء والمصاحف الصوتية"
      [basePath]="basePath"
      [tabs]="tabs"
    />
  `,
})
export class AudioLayoutComponent {
  readonly basePath = '/quranic-cms/audio';

  readonly tabs = [
    { id: 'reciters', path: 'reciters', label: 'القرّاء', emoji: '🔊' },
    { id: 'recitations', path: 'recitations', label: 'المصاحف الصوتية', emoji: '🎵' },
  ];
}
