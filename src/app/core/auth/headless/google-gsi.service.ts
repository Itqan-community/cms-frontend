import { Injectable } from '@angular/core';
import { getGsiGoogle } from './google-gsi.types';

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

@Injectable({ providedIn: 'root' })
export class GoogleGsiService {
  private scriptPromise: Promise<void> | null = null;

  /** Ensures `https://accounts.google.com/gsi/client` is loaded (idempotent). */
  ensureScript(): Promise<void> {
    if (typeof document === 'undefined') {
      return Promise.reject(new Error('Google Sign-In requires a browser DOM'));
    }
    if (getGsiGoogle()?.accounts?.id) {
      return Promise.resolve();
    }
    if (this.scriptPromise) {
      return this.scriptPromise;
    }
    this.scriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve(), { once: true });
        existing.addEventListener('error', () => reject(new Error('Failed to load Google GSI')), {
          once: true,
        });
        return;
      }
      const s = document.createElement('script');
      s.src = GSI_SCRIPT_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Failed to load Google GSI'));
      document.head.appendChild(s);
    });
    return this.scriptPromise;
  }

  /**
   * Renders Google's Sign-In button inside `host` (clears existing children).
   * `onCredential` receives the JWT `credential` suitable for `/auth/app/v1/auth/provider/token`.
   */
  async renderSignInButton(
    host: HTMLElement,
    clientId: string,
    onCredential: (idTokenJwt: string) => void,
    opts?: {
      locale?: string;
      widthPx?: number;
    }
  ): Promise<void> {
    await this.ensureScript();
    const google = getGsiGoogle();
    if (!google?.accounts?.id) {
      throw new Error('Google GSI not available after script load');
    }
    google.accounts.id.cancel();
    host.replaceChildren();

    google.accounts.id.initialize({
      client_id: clientId,
      cancel_on_tap_outside: true,
      callback: (response) => {
        const jwt = response.credential;
        if (!jwt) {
          return;
        }
        onCredential(jwt);
      },
    });

    const widthPx = opts?.widthPx ?? Math.min(Math.floor(host.offsetWidth || 320), 400);

    google.accounts.id.renderButton(host, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      width: widthPx > 0 ? widthPx : 320,
      ...(opts?.locale ? { locale: opts.locale } : {}),
    });
  }
}
