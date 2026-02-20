import { Component, inject } from '@angular/core';
import { NzButtonComponent } from 'ng-zorro-antd/button';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-switch',
  standalone: true,
  imports: [NzButtonComponent],
  styleUrls: ['./theme-switch.component.less'],
  template: `
    <button
      nz-button
      [title]="themeService.currentTheme() === 'dark' ? 'Light Mode' : 'Dark Mode'"
      (click)="themeService.toggle()"
      class="theme-switch__btn"
    >
      @if (themeService.currentTheme() === 'dark') {
        <i class="bx bx-sun"></i>
      } @else {
        <i class="bx bx-moon"></i>
      }
    </button>
  `,
})
export class ThemeSwitchComponent {
  readonly themeService = inject(ThemeService);
}
