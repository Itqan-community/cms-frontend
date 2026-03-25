import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Recitation } from '../../../features/quranic-cms/models/recitations.models';

@Component({
  selector: 'app-recitation-card',
  standalone: true,
  imports: [CommonModule, NzCardModule, NzIconModule, NzButtonModule, TranslateModule],
  templateUrl: './recitation-card.component.html',
  styleUrl: './recitation-card.component.less',
})
export class RecitationCardComponent {
  private translate = inject(TranslateService);

  get currentLang(): string {
    return this.translate.currentLang || this.translate.getDefaultLang() || 'ar';
  }

  recitation = input.required<Recitation>();

  delete = output<Recitation>();
  playClick = output<Recitation>();
}
