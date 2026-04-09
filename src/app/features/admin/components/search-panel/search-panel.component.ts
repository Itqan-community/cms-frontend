import { Component } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NgIcon } from '@ng-icons/core';
import { NzInputModule } from 'ng-zorro-antd/input';

@Component({
  selector: 'app-search-panel',
  standalone: true,
  imports: [NzButtonModule, NgIcon, NzInputModule],
  templateUrl: './search-panel.component.html',
  styleUrls: ['./search-panel.component.less'],
})
export class SearchPanelComponent {
  onSearch(): void {
    // Search logic placeholder
  }
}
