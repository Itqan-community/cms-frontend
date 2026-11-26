import { Component, inject, OnInit, RESPONSE_INIT } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UI_LANGUAGE } from '../../../../core/i18n/ui-language';
import { JsonLdService } from '../../../../core/services/json-ld.service';
import { SeoService } from '../../../../core/services/seo.service';
import { StateMessageComponent } from '../../../../shared/components/state-message/state-message.component';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [StateMessageComponent, TranslateModule],
  template: `
    <section class="not-found-page" aria-labelledby="not-found-title">
      <h1 id="not-found-title" class="sr-only">{{ 'ERRORS.NOT_FOUND_PAGE.TITLE' | translate }}</h1>
      <app-state-message
        icon="lucideCircleX"
        iconVariant="error"
        [title]="'ERRORS.NOT_FOUND_PAGE.TITLE' | translate"
        [message]="'ERRORS.NOT_FOUND_PAGE.MESSAGE' | translate"
        [secondaryActionLabel]="'ERRORS.NOT_FOUND_PAGE.CTA' | translate"
        secondaryRouterLink="/gallery"
      />
    </section>
  `,
})
export class NotFoundPage implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly jsonLd = inject(JsonLdService);
  private readonly translate = inject(TranslateService);
  private readonly uiLanguage = inject(UI_LANGUAGE);
  private readonly responseInit = inject(RESPONSE_INIT, { optional: true });

  ngOnInit(): void {
    if (this.responseInit) {
      this.responseInit.status = 404;
    }
    const lang = this.translate.currentLang || this.uiLanguage;
    const isAr = lang === 'ar';
    const translatedTitle = this.translate.instant('ERRORS.NOT_FOUND_PAGE.TITLE');
    const title =
      translatedTitle && translatedTitle !== 'ERRORS.NOT_FOUND_PAGE.TITLE'
        ? translatedTitle
        : isAr
          ? 'الصفحة غير موجودة'
          : 'Page not found';
    const translatedMsg = this.translate.instant('ERRORS.NOT_FOUND_PAGE.MESSAGE');
    const description =
      translatedMsg && translatedMsg !== 'ERRORS.NOT_FOUND_PAGE.MESSAGE'
        ? translatedMsg
        : isAr
          ? 'الصفحة التي تبحث عنها غير موجودة أو تم نقلها.'
          : 'The page you are looking for does not exist or may have been moved.';

    this.jsonLd.remove();
    this.seo.setSeo({
      title: `${title} | ${this.seo.brandName()}`,
      description,
      path: '/404',
      noIndex: true,
    });
  }
}
