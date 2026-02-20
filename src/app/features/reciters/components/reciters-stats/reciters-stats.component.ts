import { Component, inject, OnInit, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { RecitersStats } from '../../models/reciter.model';
import { RecitersService } from '../../services/reciters.service';

@Component({
  selector: 'app-reciters-stats',
  standalone: true,
  imports: [TranslateModule, NzSpinModule],
  templateUrl: './reciters-stats.component.html',
  styleUrls: ['./reciters-stats.component.less'],
})
export class RecitersStatsComponent implements OnInit {
  private readonly recitersService = inject(RecitersService);

  stats = signal<RecitersStats | null>(null);
  loading = signal(true);
  error = signal(false);

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading.set(true);
    this.error.set(false);

    this.recitersService.getRecitersStats().subscribe({
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
