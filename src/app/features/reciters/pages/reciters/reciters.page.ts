import { Component, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { ReciterFormComponent } from '../../components/reciter-form/reciter-form.component';
import { RecitersListComponent } from '../../components/reciters-list/reciters-list.component';
import { RecitersStatsComponent } from '../../components/reciters-stats/reciters-stats.component';

@Component({
  selector: 'app-reciters-page',
  standalone: true,
  imports: [TranslateModule, ReciterFormComponent, RecitersListComponent, RecitersStatsComponent],
  templateUrl: './reciters.page.html',
  styleUrls: ['./reciters.page.less'],
})
export class RecitersPage {
  private readonly recitersList = viewChild(RecitersListComponent);
  private readonly recitersStats = viewChild(RecitersStatsComponent);

  onReciterCreated(): void {
    this.recitersList()?.loadReciters();
    this.recitersStats()?.loadStats();
  }
}
