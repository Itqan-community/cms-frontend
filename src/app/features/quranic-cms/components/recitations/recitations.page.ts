import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';

import { NzEmptyModule } from 'ng-zorro-antd/empty';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { Recitation, RecitationStats } from '../../models/recitations.models';
import { RecitationsService } from '../../services/recitations/recitations.service';
import { finalize } from 'rxjs';
import { StatCardComponent } from '../../../../shared/components/stat-card/stat-card.component';
import { RecitationCardComponent } from '../../../../shared/components/recitation-card/recitation-card.component';

@Component({
  selector: 'app-recitations-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzCardModule,
    NzGridModule,
    NzInputModule,
    NzSelectModule,
    NzButtonModule,
    NzIconModule,
    NzSpinModule,
    NzTagModule,
    NzEmptyModule,
    TranslateModule,
    StatCardComponent,
    RecitationCardComponent,
    NzPaginationModule,
  ],
  templateUrl: './recitations.page.html',
  styleUrls: ['./recitations.page.less'],
})
export class RecitationsPage implements OnInit {
  private recitationsService = inject(RecitationsService);
  private message = inject(NzMessageService);
  public translate = inject(TranslateService);

  get currentLang(): string {
    return this.translate.currentLang || this.translate.getDefaultLang() || 'ar';
  }

  stats = signal<RecitationStats | null>(null);
  statsLoading = signal(true);

  recitations = signal<Recitation[]>([]);
  recitationsLoading = signal(true);

  searchQuery = signal('');
  selectedRiwayah = signal<string | null>(null);
  selectedType = signal<string | null>(null);

  currentPage = signal(1);
  pageSize = 20; // Fixed by API
  totalCount = signal(0);

  riwayahOptions = ['حفص عن عاصم', 'ورش عن نافع', 'قالون عن نافع'];
  typeOptions = ['مرتل', 'مجود'];
  ngOnInit() {
    console.log('RECITATIONS.TITLE:', this.translate.instant('RECITATIONS.TITLE'));
    this.loadStats();
    this.loadRecitations();
  }

  loadStats() {
    this.statsLoading.set(true);
    this.recitationsService
      .getStats()
      .pipe(finalize(() => this.statsLoading.set(false)))
      .subscribe({
        next: (res) => this.stats.set(res),
      });
  }

  loadRecitations() {
    this.recitationsLoading.set(true);
    this.recitationsService
      .getRecitations({
        searchQuery: this.searchQuery(),
        riwayah: this.selectedRiwayah() || undefined,
        recitationType: this.selectedType() || undefined,
        page: this.currentPage(),
      })
      .pipe(finalize(() => this.recitationsLoading.set(false)))
      .subscribe({
        next: (res) => {
          this.recitations.set(res.results || []);
          this.totalCount.set(res.count || 0);
        },
      });
  }

  onFilterChange() {
    this.currentPage.set(1);
    this.loadRecitations();
  }

  onPageChange(page: number) {
    this.currentPage.set(page);
    this.loadRecitations();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onAddRecitation() {}

  onPlayAudio(recitation: Recitation) {}

  onDelete(recitation: Recitation) {}
}
