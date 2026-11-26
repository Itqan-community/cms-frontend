import { Component, DestroyRef, inject, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UI_LANGUAGE } from '../../core/i18n/ui-language';
import { SeoService } from '../../core/services/seo.service';
import { NgIcon } from '@ng-icons/core';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-content-standards-page',
  standalone: true,
  imports: [TranslateModule, BreadcrumbComponent, NgIcon],
  templateUrl: './content-standards.page.html',
  styleUrls: ['./content-standards.page.less'],
})
export class UsageStandardsPage implements OnInit, OnDestroy {
  private readonly seo = inject(SeoService);
  private readonly translate = inject(TranslateService);
  private readonly uiLanguage = inject(UI_LANGUAGE);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.applySeo();
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.applySeo());
  }

  ngOnDestroy(): void {
    this.seo.resetToDefault(this.translate.currentLang || this.uiLanguage);
  }

  private applySeo(): void {
    this.seo.setSeo({
      title: `${this.translate.instant('CONTENT_STANDARDS.TITLE')} | ${this.seo.brandName()}`,
      description: this.translate.instant('CONTENT_STANDARDS.DESCRIPTION'),
      path: '/content-standards',
    });
  }
}
