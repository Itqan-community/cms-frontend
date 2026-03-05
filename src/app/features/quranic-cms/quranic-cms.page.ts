import { NgClass } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { RecitationsStatsCardsComponent } from './components/recitations-stats-cards/recitations-stats-cards.component';

interface CmsTab {
  id: string;
  label: string;
  emoji: string;
}

@Component({
  selector: 'app-quranic-cms-page',
  standalone: true,
  imports: [NgClass, NzModalModule, RouterLink, RecitationsStatsCardsComponent],
  templateUrl: './quranic-cms.page.html',
  styleUrls: ['./quranic-cms.page.less'],
})
export class QuranicCmsPage {
  private modal = inject(NzModalService);

  activeTab = signal('search');

  readonly tabs: CmsTab[] = [
    { id: 'search', label: 'بحث', emoji: '🔍' },
    { id: 'mushaf', label: 'المصاحف', emoji: '📖' },
    { id: 'fonts', label: 'الخطوط', emoji: '✏️' },
    { id: 'tafseer', label: 'التفاسير', emoji: '📚' },
    { id: 'translations', label: 'الترجمات', emoji: '🌍' },
    { id: 'linguistics', label: 'اللغويات', emoji: '🌐' },
    { id: 'tajweed', label: 'التجويد', emoji: '🎓' },
    { id: 'publishers', label: 'الناشرون', emoji: '📰' },
    { id: 'sources', label: 'المصادر', emoji: '🗂️' },
    { id: 'audio', label: 'الصوتيات', emoji: '🔊' },
    { id: 'software', label: 'البرمجيات', emoji: '💻' },
  ];

  activeTabEmoji = computed(() => this.tabs.find((t) => t.id === this.activeTab())?.emoji ?? '');

  setActiveTab(id: string): void {
    this.activeTab.set(id);
  }

  onSearch(): void {
    // Search logic placeholder
  }

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
