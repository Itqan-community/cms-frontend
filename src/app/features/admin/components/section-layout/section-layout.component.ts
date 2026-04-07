import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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
  imports: [RouterLink, RouterLinkActive, RouterOutlet, NgIcon],
  templateUrl: './section-layout.component.html',
  styleUrls: ['./section-layout.component.less'],
})
export class SectionLayoutComponent {
  /** Section title (e.g. "الصوتيات") */
  title = input.required<string>();

  /** Section description */
  description = input.required<string>();

  /** Base path for router links (e.g. "/admin/audio") */
  basePath = input.required<string>();

  /** Sub-tabs to display */
  tabs = input.required<SectionTab[]>();

  /** Whether to use exact match for routerLinkActive (default: true for leaf tabs) */
  exactActiveMatch = input(true);
}
