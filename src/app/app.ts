import { Location } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ar_EG, en_US, NzI18nService } from 'ng-zorro-antd/i18n';
import { filter } from 'rxjs';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
import { SentryService } from './core/services/sentry.service';
import { WebVitalsService } from './core/services/web-vitals.service';
import { HeaderComponent } from './shared/components/header/header.component';
import { PrivacyConsentBannerComponent } from './shared/components/privacy-consent-banner/privacy-consent-banner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, PrivacyConsentBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.less',
})
export class App {
  private translate = inject(TranslateService);
  private readonly nzI18n = inject(NzI18nService);
  private titleService = inject(Title);
  private location = inject(Location);
  protected router = inject(Router);
  private readonly webVitalsService = inject(WebVitalsService);
  private readonly googleAnalyticsService = inject(GoogleAnalyticsService);
  private readonly sentryService = inject(SentryService);
  protected readonly title = signal('ITQAN | إتقان');
  protected hideHeader = signal(false);
  protected fullWidth = signal(false);

  constructor() {
    void this.webVitalsService;
    this.googleAnalyticsService.init();
    this.sentryService.init();

    const syncShellFromRoute = (): void => {
      let merged: Record<string, unknown> = {};
      let node: ActivatedRouteSnapshot | null = this.router.routerState.snapshot.root;
      while (node) {
        merged = { ...merged, ...node.data };
        node = node.firstChild;
      }

      // On hard reload, the snapshot can be incomplete before the first NavigationEnd; URL is synchronous.
      const pathname = this.location.path(false).split('?')[0]?.split('#')[0] ?? '';
      if (pathname === '/admin' || pathname.startsWith('/admin/')) {
        merged = { ...merged, hideHeader: true, fullWidth: true };
      }

      this.hideHeader.set(!!merged['hideHeader']);
      this.fullWidth.set(!!merged['fullWidth']);
    };
    syncShellFromRoute();
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(syncShellFromRoute);

    const currentLang = localStorage.getItem('lang') || 'ar';
    this.translate.addLangs(['ar', 'en']);
    this.translate.setFallbackLang('ar');
    this.translate.use(currentLang);

    const applyLanguageShell = (lang: string): void => {
      const isAr = lang === 'ar';
      document.documentElement.setAttribute('lang', lang);
      document.documentElement.setAttribute('dir', isAr ? 'rtl' : 'ltr');
      this.nzI18n.setLocale(isAr ? ar_EG : en_US);
    };
    applyLanguageShell(currentLang);

    // Set initial document title by language
    this.setAppTitle(currentLang);

    // Keep shell + ng-zorro i18n aligned when language changes (e.g. future non-reload switches)
    this.translate.onLangChange.subscribe((e) => {
      this.setAppTitle(e.lang);
      applyLanguageShell(e.lang);
    });
  }

  switchLang() {
    const currentLang = localStorage.getItem('lang') || 'ar';
    const newLang = currentLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('lang', newLang);
    this.translate.use(newLang);
    document.documentElement.setAttribute('dir', newLang === 'ar' ? 'rtl' : 'ltr');

    // Keep <html> attributes in sync
    document.documentElement.setAttribute('lang', newLang);
    document.documentElement.setAttribute('dir', newLang === 'ar' ? 'rtl' : 'ltr');

    // Also update the document title after switching
    this.setAppTitle(newLang);
  }

  private setAppTitle(lang: string) {
    const title =
      lang === 'ar' ? 'إتقان | نظام إدارة المحتوى' : 'ITQAN | Content Management System';
    this.titleService.setTitle(title);
  }
}
