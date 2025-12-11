import { NgClass, NgTemplateOutlet } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { Licenses, LicensesColors } from '../../../core/enums/licenses.enum';
import { ViewportService } from '../../../core/services/viewport.service';

@Component({
  selector: 'app-license-tag',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, NzTagModule, NzIconModule, NzPopoverModule, NzDrawerModule],
  templateUrl: './license-tag.component.html',
  styleUrls: ['./license-tag.component.less'],
})
export class LicenseTagComponent {
  license = input.required<Licenses>();
  muted = input<boolean>(false);
  mode = input<'default' | 'inline'>('default');

  showPopover = signal(false);
  expanded = signal(false);

  private viewportService = inject(ViewportService);
  isMobileView = this.viewportService.isMobile;

  private translate = inject(TranslateService);

  handleTagClick() {
    if (this.isMobileView() || this.mode() === 'inline') {
      if (this.mode() === 'inline') {
        this.expanded.update((v) => !v);
      } else {
        this.showPopover.update((v) => !v);
      }
    }
  }

  get nzColor() {
    return LicensesColors[this.license()];
  }

  get licenseTitle() {
    return this.translate.instant(`LICENSES.${this.license()}`);
  }

  get licenseFullTitle() {
    return (
      this.translate.instant(`LICENSES.${this.license()}`) +
      ' - ' +
      this.translate.instant(`LICENSES_LABELS.${this.license()}`)
    );
  }

  get description() {
    return this.translate.instant(`LICENSES_DESCRIPTIONS.${this.license()}`);
  }

  get LearnMoreText() {
    return this.translate.instant('HOME.LEARN_MORE');
  }

  getLicenseUrl(licenseCode: string): string | null {
    const licenseMap: Record<string, string> = {
      CC0: 'https://creativecommons.org/publicdomain/zero/1.0/',
      CC_BY: 'https://creativecommons.org/licenses/by/4.0/',
      CC_BY_SA: 'https://creativecommons.org/licenses/by-sa/4.0/',
      CC_BY_ND: 'https://creativecommons.org/licenses/by-nd/4.0/',
      CC_BY_NC: 'https://creativecommons.org/licenses/by-nc/4.0/',
      CC_BY_NC_SA: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
      CC_BY_NC_ND: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    };
    return licenseMap[licenseCode] || null;
  }
}
