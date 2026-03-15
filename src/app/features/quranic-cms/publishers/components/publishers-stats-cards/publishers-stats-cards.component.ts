import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { PublisherStatistics } from '../../models/publishers-stats.models';
import { PublishersStatsService } from '../../services/publishers-stats.service';

interface StatCard {
  key: keyof PublisherStatistics;
  label: string;
  value: number;
  icon: string;
  bgColor: string;
  iconColor: string;
}

@Component({
  selector: 'app-publishers-stats-cards',
  standalone: true,
  imports: [NzGridModule, NzCardModule, NzSpinModule],
  template: `
    <div nz-row [nzGutter]="16" class="stats-container">
      @for (card of cards; track card.key) {
        <div nz-col [nzSpan]="8">
          <nz-card class="stat-card" [nzLoading]="loading">
            <div class="stat-content">
              <div
                class="stat-icon"
                [style.backgroundColor]="card.bgColor"
                [style.color]="card.iconColor"
              >
                <i [class]="card.icon"></i>
              </div>

              <div class="stat-info">
                <div class="stat-value">{{ card.value }}</div>
                <div class="stat-label">{{ card.label }}</div>
              </div>
            </div>
          </nz-card>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .stats-container {
        margin-bottom: 24px;
      }
      .stat-card {
        border-radius: 12px;
        border: 2px solid #f0f0f0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02);
      }
      .stat-content {
        display: flex;
        gap: 20px;
        align-items: center;
      }
      .stat-icon {
        width: 58px;
        height: 58px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
      }
      .stat-info {
        text-align: right;
      }
      .stat-value {
        font-size: 1.6rem;
        font-weight: 700;
        color: #262626;
        line-height: 1.2;
      }
      .stat-label {
        font-size: 0.9rem;
        color: #8c8c8c;
        margin-top: 4px;
      }
    `,
  ],
})
export class PublishersStatsCardsComponent implements OnInit {
  private statsService = inject(PublishersStatsService);
  private destroyRef = inject(DestroyRef);
  loading = true;

  cards: StatCard[] = [
    {
      key: 'total_publishers',
      label: 'إجمالي الناشرين',
      value: 0,
      icon: 'bx bx-newspaper',
      bgColor: '#e6f7ff',
      iconColor: '#1890ff',
    },
    {
      key: 'total_active',
      label: 'ناشرون نشطون',
      value: 0,
      icon: 'bx bx-check-circle',
      bgColor: '#f6ffed',
      iconColor: '#52c41a',
    },
    {
      key: 'total_countries',
      label: 'إجمالي الدول',
      value: 0,
      icon: 'bx bx-location-alt',
      bgColor: '#fff7e6',
      iconColor: '#fa8c16',
    },
  ];

  ngOnInit(): void {
    this.statsService.getStatistics()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (stats) => {
          this.cards.forEach((card) => {
            card.value = stats[card.key] || 0;
          });
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        },
      });
  }
}
