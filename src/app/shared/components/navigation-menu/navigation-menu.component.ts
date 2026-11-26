import { NgClass } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { LANG_QUERY_PARAMS } from '../../../core/i18n/ui-language';

export interface NavigationLink {
  link: string;
  label: string;
  disabled?: boolean;
  isExternal?: boolean;
  icon?: string;
  hidden?: boolean;
}

@Component({
  selector: 'app-navigation-menu',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe, NgClass, NgIcon],
  styleUrls: ['./navigation-menu.component.less'],
  template: `
    <nav class="nav-menu">
      @for (link of links(); track link.link) {
        @if (!link.hidden) {
          @if (!link.isExternal) {
            <a
              [routerLink]="link.link"
              [queryParams]="langParams"
              routerLinkActive="nav-menu__link--active"
              class="nav-menu__link"
              [ngClass]="{ 'nav-menu__link--disabled': link.disabled }"
            >
              {{ link.label | translate }}
              @if (link.icon) {
                <ng-icon [name]="link.icon" class="nav-menu__link-icon" />
              }
            </a>
          } @else {
            <a
              [href]="link.link"
              target="_blank"
              class="nav-menu__link"
              [ngClass]="{ 'nav-menu__link--disabled': link.disabled }"
            >
              {{ link.label | translate }}
              @if (link.icon) {
                <ng-icon [name]="link.icon" class="nav-menu__link-icon" />
              }
            </a>
          }
        }
      }
    </nav>
  `,
})
export class NavigationMenuComponent {
  readonly langParams = inject(LANG_QUERY_PARAMS);
  links = input.required<NavigationLink[]>();
}
