import { Component, inject, OnInit, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { RecitationsStats } from '../../models/recitation.model';
import { RecitationsService } from '../../services/recitations.service';

@Component({
  selector: 'app-recitations-stats',
  standalone: true,
  imports: [TranslateModule, NzSpinModule],
  templateUrl: './recitations-stats.component.html',
  styleUrls: ['./recitations-stats.component.less'],
})
export class RecitationsStatsComponent implements OnInit {
  private readonly recitationsService = inject(RecitationsService);

  stats = signal<RecitationsStats | null>(null);
  loading = signal(true);
  error = signal(false);

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading.set(true);
    this.error.set(false);

    this.recitationsService.getRecitationsStats().subscribe({
      next: (data) => {
        this.stats.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}
