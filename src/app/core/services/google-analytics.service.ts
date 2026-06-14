import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { environment } from '../../../environments/environment';

type GtagFn = (...args: unknown[]) => void;

interface GtagWindow extends Window {
  dataLayer?: unknown[];
  gtag?: GtagFn;
}

@Injectable({
  providedIn: 'root',
})
export class GoogleAnalyticsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private initialized = false;
  private enabled = false;
  private bootstrapped = false;
  private readonly pendingCalls: (() => void)[] = [];

  init(): void {
    if (this.initialized) return;
    if (!environment.production) return;
    if (!isPlatformBrowser(this.platformId)) return;

    const trackingId = (environment as { gaTrackingId?: string }).gaTrackingId;
    if (!trackingId) return;

    this.initialized = true;
    this.enabled = true;

    const scheduleIdle = (this.document.defaultView as Window)?.requestIdleCallback
      ? (cb: () => void) => (this.document.defaultView as Window).requestIdleCallback(() => cb())
      : (cb: () => void) => setTimeout(cb, 0);
    scheduleIdle(() => this.initialize(trackingId));
  }

  pageView(path: string, title?: string): void {
    const win = this.document.defaultView as GtagWindow | null;
    const pageLocation = win?.location ? `${win.location.origin}${path}` : path;

    this.callGtag('event', 'page_view', {
      page_path: path,
      page_location: pageLocation,
      page_title: title ?? this.document.title,
    });
  }

  event(name: string, params?: Record<string, unknown>): void {
    this.callGtag('event', name, params);
  }

  private initialize(trackingId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const gtagScript = this.document.createElement('script');
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
    this.document.head.appendChild(gtagScript);

    const inlineScript = this.document.createElement('script');
    inlineScript.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${trackingId}', { send_page_view: false });
    `;

    const nonce = this.getCspNonce();
    if (nonce) {
      inlineScript.setAttribute('nonce', nonce);
    }

    this.document.head.appendChild(inlineScript);
    this.bootstrapped = true;
    this.flushPending();
  }

  private callGtag(...args: unknown[]): void {
    if (!this.enabled) return;

    const run = (): void => {
      const win = this.document.defaultView as GtagWindow | null;
      if (typeof win?.gtag === 'function') {
        win.gtag(...args);
        return;
      }

      win?.dataLayer?.push(args);
    };

    if (this.bootstrapped) {
      run();
      return;
    }

    this.pendingCalls.push(run);
  }

  private flushPending(): void {
    for (const call of this.pendingCalls) {
      call();
    }
    this.pendingCalls.length = 0;
  }

  /**
   * Retrieves CSP nonce from meta tag if available.
   * The nonce should be set by the server in a meta tag: <meta name="csp-nonce" content="...">
   */
  private getCspNonce(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null;

    const nonceMeta = this.document.querySelector('meta[name="csp-nonce"]');
    return nonceMeta?.getAttribute('content') || null;
  }
}
