import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GoogleAnalyticsService {
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    if (!environment.production) return;
    this.initialized = true;

    const scheduleIdle = window.requestIdleCallback
      ? (cb: () => void) => window.requestIdleCallback(() => cb())
      : (cb: () => void) => setTimeout(cb, 0);
    scheduleIdle(() => this.initialize());
  }

  private initialize(): void {
    const trackingId = (environment as { gaTrackingId?: string }).gaTrackingId;

    if (!trackingId) {
      return;
    }

    const gtagScript = document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
    document.head.appendChild(gtagScript);

    const inlineScript = document.createElement('script');
    inlineScript.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${trackingId}');
    `;
    document.head.appendChild(inlineScript);
  }
}
