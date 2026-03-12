import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';

interface CmsTab {
  id: string;
  path: string;
  label: string;
  emoji: string;
}

@Component({
  selector: 'app-quranic-cms-page',
  standalone: true,
  imports: [NzModalModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './quranic-cms.page.html',
  styleUrls: ['./quranic-cms.page.less'],
})
export class QuranicCmsPage {
  private modal = inject(NzModalService);

  readonly tabs: CmsTab[] = [
    { id: 'search', path: 'search', label: 'بحث', emoji: '🔍' },
    { id: 'mushafs', path: 'mushafs', label: 'المصاحف', emoji: '📖' },
    { id: 'fonts', path: 'fonts', label: 'الخطوط', emoji: '✏️' },
    { id: 'tafsirs', path: 'tafsirs', label: 'التفاسير', emoji: '📚' },
    { id: 'translations', path: 'translations', label: 'الترجمات', emoji: '🌍' },
    { id: 'linguistics', path: 'linguistics', label: 'اللغويات', emoji: '🌐' },
    { id: 'tajweed', path: 'tajweed', label: 'التجويد', emoji: '🎓' },
    { id: 'publishers', path: 'publishers', label: 'الناشرون والمصادر', emoji: '📰' },
    { id: 'audio', path: 'audio', label: 'الصوتيات', emoji: '🔊' },
    { id: 'software', path: 'software', label: 'البرمجيات', emoji: '💻' },
  ];

  onRefresh(): void {
    this.modal.confirm({
      nzTitle: 'هل تريد إعادة تهيئة البيانات؟',
      nzContent: 'سيتم تحديث جميع المشاريع والبيانات التجريبية.',
      nzOkText: 'تأكيد',
      nzCancelText: 'إلغاء',
      nzDirection: 'rtl',
      nzOnOk: () => {
        // Refresh logic here
      },
    });
  }
}
