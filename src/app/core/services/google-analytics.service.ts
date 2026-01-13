import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class GoogleAnalyticsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private initialized = false;

  init(): void {
    if (this.initialized) return;
    if (!environment.production) return;
    if (!isPlatformBrowser(this.platformId)) return;
    this.initialized = true;

    const scheduleIdle = (this.document.defaultView as Window)?.requestIdleCallback
      ? (cb: () => void) => (this.document.defaultView as Window).requestIdleCallback(() => cb())
      : (cb: () => void) => setTimeout(cb, 0);
    scheduleIdle(() => this.initialize());
  }

  private initialize(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const trackingId = (environment as { gaTrackingId?: string }).gaTrackingId;

    if (!trackingId) {
      return;
    }

    const gtagScript = this.document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
    this.document.head.appendChild(gtagScript);

    const inlineScript = this.document.createElement('script');
    inlineScript.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${trackingId}');
    `;

    // Add CSP nonce if available (from meta tag or server-provided)
    const nonce = this.getCspNonce();
    if (nonce) {
      inlineScript.setAttribute('nonce', nonce);
    }

    this.document.head.appendChild(inlineScript);
  }

  /**
   * Retrieves CSP nonce from meta tag if available.
   * The nonce should be set by the server in a meta tag: <meta name="csp-nonce" content="...">
   * @returns The CSP nonce string or null if not found
   */
  private getCspNonce(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;

    const nonceMeta = this.document.querySelector('meta[name="csp-nonce"]');
    return nonceMeta?.getAttribute('content') || null;
  }
}
