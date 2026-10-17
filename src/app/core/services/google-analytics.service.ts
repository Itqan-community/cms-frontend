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
    if (!environment.production) return;
    if (!isPlatformBrowser(this.platformId)) return;
    this.setOptOut(false);
    if (this.initialized) return;
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
   * Stops tracking after the visitor withdraws consent: sets Google's documented
   * `ga-disable-<ID>` opt-out flag and removes the `_ga` cookies already written.
   */
  disable(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!(environment as { gaTrackingId?: string }).gaTrackingId) return;
    this.setOptOut(true);
    this.deleteGaCookies();
  }

  /** Sets or clears Google's `ga-disable-<ID>` flag, which makes gtag drop every hit. */
  private setOptOut(optOut: boolean): void {
    const trackingId = (environment as { gaTrackingId?: string }).gaTrackingId;
    const win = this.document.defaultView as (Window & Record<string, unknown>) | null;
    if (!trackingId || !win) return;
    win[`ga-disable-${trackingId}`] = optOut;
  }

  /** GA writes its cookies on the widest domain it can, so expire them on every parent domain. */
  private deleteGaCookies(): void {
    const names = this.document.cookie
      .split(';')
      .map((c) => c.split('=')[0]?.trim() ?? '')
      .filter((name) => name === '_ga' || name.startsWith('_ga_'));
    if (!names.length) return;

    const labels = (this.document.location?.hostname ?? '').split('.');
    const domains = labels.map((_, i) => labels.slice(i).join('.')).filter((d) => d.includes('.'));
    for (const name of names) {
      this.document.cookie = `${name}=; Max-Age=0; path=/`;
      for (const domain of domains) {
        this.document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain}`;
      }
    }
  }

  trackEvent(name: string, params?: Record<string, unknown>): void {
    if (!environment.production) return;
    if (!isPlatformBrowser(this.platformId)) return;

    const trackingId = (environment as { gaTrackingId?: string }).gaTrackingId;
    if (!trackingId) return;

    const gtag = (this.document.defaultView as Window & { gtag?: (...args: unknown[]) => void })
      ?.gtag;
    if (typeof gtag !== 'function') return;

    gtag('event', name, params);
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
