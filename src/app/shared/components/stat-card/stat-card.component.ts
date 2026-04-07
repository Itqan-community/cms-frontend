import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule, NzCardModule, NgIcon, TranslateModule],
  templateUrl: './stat-card.component.html',
  styleUrl: './stat-card.component.less',
})
export class StatCardComponent {
  value = input<number | string>(0);
  label = input<string>('');
  icon = input<string>('');
  colorTheme = input<string>('blue');
}
