import { Component } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NgIcon } from '@ng-icons/core';
import { NzInputModule } from 'ng-zorro-antd/input';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-search-panel',
  standalone: true,
  imports: [NzButtonModule, NgIcon, NzInputModule, TranslateModule],
  templateUrl: './search-panel.component.html',
  styleUrls: ['./search-panel.component.less'],
})
export class SearchPanelComponent {
  onSearch(): void {
    // Search logic placeholder
  }
}
