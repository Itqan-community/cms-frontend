import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-license-details-page',
  standalone: true,
  imports: [RouterModule, TranslateModule, BreadcrumbComponent, NzButtonModule, NgIcon],
  templateUrl: './license-details.page.html',
  styleUrls: ['./license-details.page.less'],
})
export class LicenseDetailsPage {
  private readonly route = inject(ActivatedRoute);

  readonly licenseId = this.route.snapshot.paramMap.get('id') || '';

  getLicenseTranslationKey(licenseCode: string): string {
    // Convert URL format (CC-BY) to translation key format (CC-BY)
    // The translation keys use the same format
    return `LICENSES_LABELS.${licenseCode}`;
  }

  getLicenseUrl(licenseCode: string): string {
    const licenseMap: Record<string, string> = {
      CC0: 'https://creativecommons.org/publicdomain/zero/1.0/',
      'CC-BY': 'https://creativecommons.org/licenses/by/4.0/',
      'CC-BY-SA': 'https://creativecommons.org/licenses/by-sa/4.0/',
      'CC-BY-ND': 'https://creativecommons.org/licenses/by-nd/4.0/',
      'CC-BY-NC': 'https://creativecommons.org/licenses/by-nc/4.0/',
      'CC-BY-NC-SA': 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
      'CC-BY-NC-ND': 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    };

    return licenseMap[licenseCode] || '#';
  }
}
