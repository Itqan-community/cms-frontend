import { HttpErrorResponse } from '@angular/common/http';
import type { ErrorEvent, EventHint } from '@sentry/angular';
import { filterBenignNetworkSentryEvent } from './sentry-before-send.util';

function eventWithMessage(message: string, type = 'Error'): ErrorEvent {
  return {
    type: undefined,
    exception: {
      values: [{ type, value: message }],
    },
  } as ErrorEvent;
}

describe('filterBenignNetworkSentryEvent', () => {
  it('drops Importing a module script failed', () => {
    const event = eventWithMessage('Importing a module script failed.', 'TypeError');
    expect(filterBenignNetworkSentryEvent(event)).toBeNull();
  });

  it('drops Http failure response status 0 message', () => {
    const event = eventWithMessage('Http failure response for /i18n/ar.json: 0 Unknown Error');
    expect(filterBenignNetworkSentryEvent(event)).toBeNull();
  });

  it('drops originalException HttpErrorResponse with status 0', () => {
    const event = eventWithMessage('something else');
    const hint: EventHint = {
      originalException: new HttpErrorResponse({
        status: 0,
        statusText: 'Unknown Error',
        url: '/i18n/ar.json',
      }),
    };
    expect(filterBenignNetworkSentryEvent(event, hint)).toBeNull();
  });

  it('drops object-captured HTTP response shape noise', () => {
    const event = eventWithMessage(
      'Object captured as exception with keys: error, headers, message, name, ok, redirected, status, statusText, type, url'
    );
    expect(filterBenignNetworkSentryEvent(event)).toBeNull();
  });

  it('keeps unrelated application errors', () => {
    const event = eventWithMessage('NullInjectorError: No provider for Foo');
    expect(filterBenignNetworkSentryEvent(event)).toBe(event);
  });

  it('keeps non-zero HTTP failures', () => {
    const event = eventWithMessage(
      'Http failure response for /cms-api/assets/: 500 Internal Server Error'
    );
    const hint: EventHint = {
      originalException: new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error',
      }),
    };
    expect(filterBenignNetworkSentryEvent(event, hint)).toBe(event);
  });
});
