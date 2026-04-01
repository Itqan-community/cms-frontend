import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { AdminAuthService } from './services/admin-auth.service';

interface CmsTab {
  id: string;
  path: string;
  label: string;
  emoji: string;
}

const ALL_TABS: CmsTab[] = [
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

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [NzModalModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.less'],
})
export class AdminLayoutComponent {
  private readonly modal = inject(NzModalService);
  private readonly adminAuth = inject(AdminAuthService);

  readonly tabs = computed(() => {
    if (this.adminAuth.isItqanAdmin()) {
      return ALL_TABS;
    }
    // Publisher admin sees all except publishers tab
    return ALL_TABS.filter((t) => t.id !== 'publishers');
  });

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
