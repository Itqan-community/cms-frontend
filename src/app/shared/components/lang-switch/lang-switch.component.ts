import { Component, inject, input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { NzButtonComponent } from 'ng-zorro-antd/button';

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
    return this.translate.getCurrentLang() === 'ar' ? 'English' : 'العربية';
  }

  get label() {
    return this.translate.getCurrentLang() === 'ar' ? 'English' : 'العربية';
  }

  toggleLang() {
    const current = this.translate.getCurrentLang() || 'ar';
    const next = current === 'ar' ? 'en' : 'ar';
    localStorage.setItem('lang', next);
    window.location.reload();
  }
}
