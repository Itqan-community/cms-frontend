import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzIconModule, TranslateModule],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.less',
})
export class StatCardComponent {
  value = input<number | string>(0);
  label = input<string>('');
  icon = input<string>('');
  colorTheme = input<string>('blue');
}
