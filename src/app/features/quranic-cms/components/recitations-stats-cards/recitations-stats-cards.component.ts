import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { RecitationsStats } from '../../models/recitations-stats.model';
import { RecitationsStatsService } from '../../services/recitations-stats.service';

@Component({
  selector: 'app-qcms-recitations-stats-cards',
  standalone: true,
  imports: [NgIf, NgClass],
  templateUrl: './recitations-stats-cards.component.html',
  styleUrls: ['./recitations-stats-cards.component.less'],
})
export class RecitationsStatsCardsComponent implements OnInit {
  private readonly statsService = inject(RecitationsStatsService);

  loading = signal(true);
  stats = signal<RecitationsStats | null>(null);

  usingMock = computed(() => this.stats()?.isMock === true);

  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    this.loading.set(true);
    this.statsService.getStats().subscribe({
      next: (data) => this.stats.set(data),
      error: () => {
        // In case something unexpected happens before catchError,
        // we still want to show a safe fallback.
        this.stats.set({
          riwayas: 0,
          reciters: 0,
          recitations: 0,
          isMock: true,
        });
      },
      complete: () => this.loading.set(false),
    });
  }
}

