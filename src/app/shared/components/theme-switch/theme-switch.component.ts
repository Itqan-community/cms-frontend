import { Component, computed, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { NzButtonComponent } from 'ng-zorro-antd/button';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-switch',
  standalone: true,
  styleUrls: ['../lang-switch/lang-switch.component.less'],
  template: `
    <button
      nz-button
      [title]="labelKey() | translate"
      (click)="theme.toggle()"
      class="lang-switch__btn"
      [class.--icon-only]="!showLabel()"
      [class.w-full]="fullWidth()"
    >
      <ng-icon
        [name]="theme.isDark() ? 'lucideSun' : 'lucideMoon'"
        class="lang-switch__icon"
        aria-hidden="true"
      />
      <span class="sr-only">{{ labelKey() | translate }}</span>
      @if (showLabel()) {
        <span>{{ labelKey() | translate }}</span>
      }
    </button>
  `,
  imports: [NzButtonComponent, NgIcon, TranslateModule],
})
export class ThemeSwitchComponent {
  readonly theme = inject(ThemeService);

  showLabel = input(false);
  fullWidth = input(false);

  readonly labelKey = computed(() =>
    this.theme.isDark() ? 'COMMON.THEME_SWITCH_TO_LIGHT' : 'COMMON.THEME_SWITCH_TO_DARK'
  );
}
