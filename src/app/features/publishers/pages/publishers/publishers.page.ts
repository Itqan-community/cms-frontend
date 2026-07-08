import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { SeoService } from '../../../../core/services/seo.service';

@Component({
  selector: 'app-publishers-page',
  templateUrl: './publishers.page.html',
  styleUrl: './publishers.page.less',
})
export class PublishersPage implements OnInit {
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
      title: isAr ? 'الناشرون | إتقان' : 'Publishers | ITQAN',
      description: isAr
        ? 'تصفح الجهات الناشرة للمحتوى القرآني على منصة إتقان.'
        : 'Browse the publishers contributing Quranic content on ITQAN.',
      path: '/publishers',
    });
  }
}
