import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SeoService } from '../../../../core/services/seo.service';
import { AssetsListingComponent } from '../../components/assets-listing/assets-listing.component';

@Component({
  selector: 'app-gallery-page',
  standalone: true,
  templateUrl: './gallery.page.html',
  styleUrls: ['./gallery.page.less'],
  imports: [AssetsListingComponent, TranslateModule],
})
export class GalleryPage implements OnInit {
  private readonly seo = inject(SeoService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.setSeo(this.translate.currentLang || 'ar');
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((e) => this.setSeo(e.lang));
  }

  private setSeo(lang: string): void {
    const isAr = lang === 'ar';
    this.seo.setSeo({
      title: isAr ? 'مكتبة الأصول القرآنية | إتقان' : 'Assets Library | ITQAN',
      description: isAr
        ? 'تصفح وابحث في مكتبة الأصول القرآنية: مصاحف، تلاوات، تفاسير، وترجمات مفتوحة المصدر.'
        : 'Browse and search the ITQAN assets library: Mushafs, recitations, tafsir, and translations, open for reuse.',
      path: '/gallery',
    });
  }
}
