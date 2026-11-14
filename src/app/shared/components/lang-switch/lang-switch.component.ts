import { Component, inject, input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { NzButtonComponent } from 'ng-zorro-antd/button';
import { LANG_QUERY_PARAM, persistUiLanguage } from '../../../core/i18n/ui-language';

@Component({
  selector: 'app-lang-switch',
  standalone: true,
  styleUrls: ['./lang-switch.component.less'],
  template: `
    <button
      nz-button
      [title]="langTooltip"
      (click)="toggleLang()"
      class="lang-switch__btn"
      [class.--icon-only]="!showLabel()"
      [class.w-full]="fullWidth()"
    >
      <ng-icon name="lucideLanguages" class="lang-switch__icon" aria-hidden="true" />
      <span class="sr-only">{{ langTooltip }}</span>
      @if (showLabel()) {
        <span>{{ label }}</span>
      }
    </button>
  `,
  imports: [NzButtonComponent, NgIcon],
})
export class LangSwitchComponent {
  private translate = inject(TranslateService);

  showLabel = input(false);
  fullWidth = input(false);

  get langTooltip() {
    return this.translate.getCurrentLang() === 'ar'
      ? this.translate.instant('COMMON.LANG_SWITCH_TO_EN')
      : this.translate.instant('COMMON.LANG_SWITCH_TO_AR');
  }

  get label() {
    return this.langTooltip;
  }

  toggleLang() {
    const current = this.translate.getCurrentLang() || 'ar';
    const next = current === 'ar' ? 'en' : 'ar';
    persistUiLanguage(next);
    // A `?lang=` URL renders that language, so point it at the new one instead of reloading.
    const url = new URL(window.location.href);
    if (url.searchParams.has(LANG_QUERY_PARAM)) {
      url.searchParams.set(LANG_QUERY_PARAM, next);
      window.location.assign(url.toString());
      return;
    }
    window.location.reload();
  }
}
