import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { GoogleAnalyticsService } from './google-analytics.service';

type EnvWithGa = typeof environment & { gaTrackingId?: string };

interface GtagWindow extends Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
}

describe('GoogleAnalyticsService', () => {
  const env = environment as EnvWithGa;
  const originalProduction = environment.production;
  const originalGaTrackingId = env.gaTrackingId;
  const trackingId = 'G-Y38325E2JX';

  let service: GoogleAnalyticsService;

  const removeGaScripts = (): void => {
    document.head
      .querySelectorAll('script[src*="googletagmanager.com/gtag/js"]')
      .forEach((node) => {
        node.remove();
      });
    document.head.querySelectorAll('script').forEach((node) => {
      if (node.textContent?.includes('dataLayer')) {
        node.remove();
      }
    });
  };

  const resetWindowAnalytics = (): void => {
    (window as GtagWindow).dataLayer = [];
  };

  beforeEach(() => {
    TestBed.resetTestingModule();
    spyOn(window, 'requestIdleCallback').and.callFake((callback: IdleRequestCallback) => {
      window.setTimeout(
        () => callback({ didTimeout: false, timeRemaining: () => 0 } as IdleDeadline),
        0
      );
      return 1;
    });
    removeGaScripts();
    resetWindowAnalytics();
    TestBed.configureTestingModule({
      providers: [GoogleAnalyticsService],
    });
    service = TestBed.inject(GoogleAnalyticsService);
  });

  afterEach(() => {
    environment.production = originalProduction;
    if (originalGaTrackingId === undefined) {
      delete env.gaTrackingId;
    } else {
      env.gaTrackingId = originalGaTrackingId;
    }
    removeGaScripts();
    resetWindowAnalytics();
  });

  it('does not initialize when production is false', fakeAsync(() => {
    environment.production = false;
    env.gaTrackingId = trackingId;

    service.init();
    tick();

    expect(document.head.querySelector('script[src*="googletagmanager.com/gtag/js"]')).toBeNull();
  }));

  it('does not initialize when gaTrackingId is missing', fakeAsync(() => {
    environment.production = true;
    delete env.gaTrackingId;

    service.init();
    tick();

    expect(document.head.querySelector('script[src*="googletagmanager.com/gtag/js"]')).toBeNull();
  }));

  it('initializes gtag scripts in production with send_page_view disabled', fakeAsync(() => {
    environment.production = true;
    env.gaTrackingId = trackingId;

    service.init();
    tick();

    const externalScript = document.head.querySelector(
      `script[src="https://www.googletagmanager.com/gtag/js?id=${trackingId}"]`
    );
    expect(externalScript).not.toBeNull();

    const inlineScript = Array.from(document.head.querySelectorAll('script')).find((node) =>
      node.textContent?.includes(`gtag('config', '${trackingId}', { send_page_view: false })`)
    );
    expect(inlineScript).toBeDefined();
  }));

  it('queues page_view before bootstrap and flushes after init', fakeAsync(() => {
    environment.production = true;
    env.gaTrackingId = trackingId;

    service.init();
    service.pageView('/queued-path', 'Queued Title');
    expect(findPageViewEntry(window as GtagWindow)).toBeUndefined();

    tick();

    const pageViewEntry = findPageViewEntry(window as GtagWindow);
    expect(pageViewEntry).toBeDefined();
    expect(pageViewEntry?.[2]).toEqual(
      jasmine.objectContaining({
        page_path: '/queued-path',
        page_location: `${window.location.origin}/queued-path`,
        page_title: 'Queued Title',
      })
    );
  }));

  it('sends page_view with path, location, and title after bootstrap', fakeAsync(() => {
    environment.production = true;
    env.gaTrackingId = trackingId;

    service.init();
    tick();
    service.pageView('/gallery', 'Gallery Title');

    const pageViewEntry = findPageViewEntry(window as GtagWindow);
    expect(pageViewEntry).toBeDefined();
    expect(pageViewEntry?.[2]).toEqual(
      jasmine.objectContaining({
        page_path: '/gallery',
        page_location: `${window.location.origin}/gallery`,
        page_title: 'Gallery Title',
      })
    );
  }));

  it('does not send page_view when analytics is disabled', () => {
    environment.production = false;
    delete env.gaTrackingId;

    service.init();
    service.pageView('/gallery', 'Gallery Title');

    expect(findPageViewEntry(window as GtagWindow)).toBeUndefined();
  });
});

function findPageViewEntry(win: GtagWindow): { 2?: Record<string, unknown> } | undefined {
  return win.dataLayer?.find((entry) => {
    const args = entry as { 0?: string; 1?: string; 2?: Record<string, unknown> };
    return args[0] === 'event' && args[1] === 'page_view';
  }) as { 2?: Record<string, unknown> } | undefined;
}
