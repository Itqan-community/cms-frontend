import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { RecitationsListComponent } from '../../components/recitations-list/recitations-list.component';
import { RecitationsStatsComponent } from '../../components/recitations-stats/recitations-stats.component';

@Component({
  selector: 'app-recitations-page',
  standalone: true,
  imports: [TranslateModule, RecitationsStatsComponent, RecitationsListComponent],
  templateUrl: './recitations.page.html',
  styleUrls: ['./recitations.page.less'],
})
export class RecitationsPage {}
