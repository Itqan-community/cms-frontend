import { Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
import { WebVitalsService } from './core/services/web-vitals.service';
import { HeaderComponent } from './shared/components/header/header.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { ThemeService } from './shared/services/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, ToastContainerComponent],
  templateUrl: './app.html',
  styleUrl: './app.less',
})
export class App {
  private translate = inject(TranslateService);
  private titleService = inject(Title);
  protected router = inject(Router);
  private readonly webVitalsService = inject(WebVitalsService);
  private readonly googleAnalyticsService = inject(GoogleAnalyticsService);
  private readonly themeService = inject(ThemeService);

  protected readonly title = signal('ITQAN | إتقان');

  constructor() {
    void this.webVitalsService;
    this.googleAnalyticsService.init();
    this.themeService.init();

    const currentLang = localStorage.getItem('lang') || 'ar';
    this.translate.addLangs(['ar', 'en']);
    this.translate.setFallbackLang('ar');
    this.translate.use(currentLang);
    document.documentElement.setAttribute('dir', currentLang === 'ar' ? 'rtl' : 'ltr');

    // Set initial document title by language
    this.setAppTitle(currentLang);

    // Update title on language changes triggered anywhere
    this.translate.onLangChange.subscribe((e) => {
      this.setAppTitle(e.lang);
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
