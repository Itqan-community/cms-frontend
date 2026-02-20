import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RecitationsStatsComponent } from '../../components/recitations-stats/recitations-stats.component';

@Component({
  selector: 'app-recitations-page',
  standalone: true,
  imports: [TranslateModule, RecitationsStatsComponent],
  templateUrl: './recitations.page.html',
  styleUrls: ['./recitations.page.less'],
})
export class RecitationsPage {}
