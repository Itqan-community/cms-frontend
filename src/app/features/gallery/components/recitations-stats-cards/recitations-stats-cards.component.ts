import { Component, inject, OnInit, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RecitationsStats } from '../../models/recitations-stats.model';
import { RecitationsStatsService } from '../../services/recitations-stats.service';

@Component({
  selector: 'app-recitations-stats-cards',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './recitations-stats-cards.component.html',
  styleUrl: './recitations-stats-cards.component.less',
})
export class RecitationsStatsCardsComponent implements OnInit {
  private readonly statsService = inject(RecitationsStatsService);

  loading = signal<boolean>(true);
  stats = signal<RecitationsStats | null>(null);

  ngOnInit(): void {
    this.loadStats();
  }

  /**
   * Load statistics from the API.
   * Called automatically on component initialization and can be called manually to refresh data.
   */
  loadStats(): void {
    this.loading.set(true);
    this.statsService.getStats().subscribe({
      next: (data) => this.stats.set(data),
      complete: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  /**
   * Public method to refresh statistics.
   * Can be called from parent component or via ViewChild reference.
   */
  refresh(): void {
    this.loadStats();
  }
}
