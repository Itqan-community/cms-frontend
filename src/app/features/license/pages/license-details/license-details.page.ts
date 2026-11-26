import { Component, inject, OnDestroy, OnInit, RESPONSE_INIT } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NgIcon } from '@ng-icons/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { Licenses } from '../../../../core/enums/licenses.enum';
import { UI_LANGUAGE } from '../../../../core/i18n/ui-language';
import { SeoService } from '../../../../core/services/seo.service';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { StateMessageComponent } from '../../../../shared/components/state-message/state-message.component';

@Component({
  selector: 'app-license-details-page',
  standalone: true,
  imports: [
    RouterModule,
    TranslateModule,
    BreadcrumbComponent,
    StateMessageComponent,
    NzButtonModule,
    NgIcon,
  ],
  templateUrl: './license-details.page.html',
  styleUrls: ['./license-details.page.less'],
})
export class LicenseDetailsPage implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly translate = inject(TranslateService);
  private readonly uiLanguage = inject(UI_LANGUAGE);
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });

  readonly licenseId = this.route.snapshot.paramMap.get('id') || '';
  readonly isValidLicense = Object.values(Licenses).includes(this.licenseId as Licenses);

  ngOnInit(): void {
    if (!this.isValidLicense) {
      if (this.responseInit) {
        this.responseInit.status = 404;
      }
      this.seo.setSeo({
        title: `${this.translate.instant('ERRORS.LICENSE_NOT_FOUND_TITLE')} | ${this.seo.brandName()}`,
        description: this.translate.instant('ERRORS.LICENSE_NOT_FOUND_MESSAGE'),
        path: `/license/${encodeURIComponent(this.licenseId)}`,
        noIndex: true,
      });
      return;
    }

    this.seo.setSeo({
      title: `${this.licenseId} | ${this.seo.brandName()}`,
      description: this.translate.instant(this.getLicenseTranslationKey(this.licenseId)),
      path: `/license/${encodeURIComponent(this.licenseId)}`,
    });
  }

  ngOnDestroy(): void {
    this.seo.resetToDefault(this.uiLanguage);
  }

  getLicenseTranslationKey(licenseCode: string): string {
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
