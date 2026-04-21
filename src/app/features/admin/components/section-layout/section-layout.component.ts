import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';

export interface SectionTab {
  id: string;
  path: string;
  label: string;
  icon?: string;
}

@Component({
  selector: 'app-section-layout',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NgIcon, TranslateModule],
  templateUrl: './section-layout.component.html',
  styleUrls: ['./section-layout.component.less'],
})
export class SectionLayoutComponent {
  /** i18n key for section title */
  title = input.required<string>();

  /** i18n key for section description */
  description = input.required<string>();

  /** Base path for router links (e.g. "/admin/audio") */
  basePath = input.required<string>();

  /** Sub-tabs to display */
  tabs = input.required<SectionTab[]>();

  /** Whether to use exact match for routerLinkActive (default: true for leaf tabs) */
  exactActiveMatch = input(true);
}
