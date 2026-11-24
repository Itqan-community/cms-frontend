import { Component, DestroyRef, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { skip } from 'rxjs';
import { UI_LANGUAGE } from '../../../../core/i18n/ui-language';
import { JsonLdService } from '../../../../core/services/json-ld.service';
import { SeoService } from '../../../../core/services/seo.service';
import { parsePositivePageParam } from '../../../../shared/components/crawlable-pagination/crawlable-pagination.component';
import { AssetsListingComponent } from '../../components/assets-listing/assets-listing.component';

@Component({
  selector: 'app-gallery-page',
  standalone: true,
  templateUrl: './gallery.page.html',
  styleUrls: ['./gallery.page.less'],
  imports: [AssetsListingComponent, TranslateModule],
})
export class GalleryPage implements OnInit, OnDestroy {
  private readonly seo = inject(SeoService);
  private readonly jsonLd = inject(JsonLdService);
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);
  private readonly uiLanguage = inject(UI_LANGUAGE);
  private readonly destroyRef = inject(DestroyRef);

  private readonly page = signal(
    parsePositivePageParam(this.route.snapshot.queryParamMap.get('page'))
  );

  ngOnInit(): void {
    this.setSeo(this.translate.currentLang || this.uiLanguage);

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((e) => this.setSeo(e.lang));

    this.route.queryParamMap
      .pipe(skip(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const nextPage = parsePositivePageParam(params.get('page'));
        if (nextPage !== this.page()) {
          this.page.set(nextPage);
          this.setSeo(this.translate.currentLang || this.uiLanguage);
        }
      });
  }

  ngOnDestroy(): void {
    this.jsonLd.remove();
    this.seo.resetToDefault(this.translate.currentLang || this.uiLanguage);
  }

  private setSeo(lang: string): void {
    const isAr = (lang || this.uiLanguage) === 'ar';
    const page = this.page();
    const brand = this.seo.brandName();
    const baseTitle = isAr ? `مكتبة الأصول القرآنية | ${brand}` : `Assets Library | ${brand}`;
    const title = page > 1 ? `${baseTitle} (${isAr ? `صفحة ${page}` : `Page ${page}`})` : baseTitle;
    const description = isAr
      ? 'تصفح وابحث في مكتبة الأصول القرآنية: مصاحف، تلاوات، تفاسير، وترجمات مفتوحة المصدر.'
      : 'Browse and search the ITQAN assets library: Mushafs, recitations, tafsir, and translations, open for reuse.';
    const inLanguage = isAr ? 'ar' : 'en';

    this.seo.setSeo({
      title,
      description,
      path: '/gallery',
      page,
    });
    this.jsonLd.setSchema({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'WebSite',
          name: brand,
          url: this.seo.canonicalUrl('/gallery'),
          inLanguage,
        },
        {
          '@type': 'CollectionPage',
          name: title,
          description,
          url: this.seo.canonicalUrl('/gallery', page),
          inLanguage,
        },
      ],
    });
  }
}
