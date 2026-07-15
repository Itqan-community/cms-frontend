import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { localizeCountryCodeOrName } from '../../../admin/utils/display-localization.util';
import { Reciter } from '../../models/reciter.model';

@Component({
  selector: 'app-reciter-card',
  imports: [RouterLink, TranslateModule, NgIcon],
  templateUrl: './reciter-card.component.html',
  styleUrl: './reciter-card.component.less',
})
export class ReciterCardComponent {
  private readonly translate = inject(TranslateService);

  reciter = input.required<Reciter>();

  get nationalityLabel(): string {
    return localizeCountryCodeOrName(this.reciter().nationality, this.translate.currentLang, {
      empty: this.translate.instant('COMMON.EM_DASH'),
    });
  }
}
