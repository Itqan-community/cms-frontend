import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

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
  imports: [RouterLink, RouterLinkActive, TranslatePipe, NgClass],
  styleUrls: ['./navigation-menu.component.less'],
  template: `
    <nav class="nav-menu">
      @for (link of links(); track link.link) {
        @if (!link.hidden) {
          @if (!link.isExternal) {
            <a
              [routerLink]="link.link"
              routerLinkActive="nav-menu__link--active"
              class="nav-menu__link"
              [ngClass]="{ 'nav-menu__link--disabled': link.disabled }"
            >
              {{ link.label | translate }}
              @if (link.icon) {
                <i class="nav-menu__link-icon {{ link.icon }}"></i>
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
                <i class="nav-menu__link-icon {{ link.icon }}"></i>
              }
            </a>
          }
        }
      }
    </nav>
  `,
})
export class NavigationMenuComponent {
  links = input.required<NavigationLink[]>();
}
