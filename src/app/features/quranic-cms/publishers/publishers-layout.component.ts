import { Component } from '@angular/core';
import { SectionLayoutComponent } from '../components/section-layout/section-layout.component';

@Component({
  selector: 'app-publishers-layout',
  standalone: true,
  imports: [SectionLayoutComponent],
  template: `
    <app-section-layout
      title="الناشرون والمصادر"
      description="إدارة الناشرين والمؤلفين والمصادر المستخدمة في المشاريع القرآنية"
      [basePath]="basePath"
      [tabs]="tabs"
    />
  `,
})
export class PublishersLayoutComponent {
  readonly basePath = '/quranic-cms/publishers';

  readonly tabs = [
    { id: 'publishers', path: 'publishers', label: 'الناشرون' },
    { id: 'authors', path: 'authors', label: 'المؤلفون' },
    { id: 'sources', path: 'sources', label: 'المصادر' },
  ];
}
