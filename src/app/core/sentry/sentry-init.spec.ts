import * as Sentry from '@sentry/angular';
import { stopSentry } from './sentry-init';

describe('stopSentry', () => {
  it('does nothing when Sentry was never started', () => {
    expect(() => stopSentry()).not.toThrow();
  });

  it('disables the client immediately, before close() finishes flushing', () => {
    // Arrange: a client that never sends anything.
    Sentry.init({
      dsn: 'https://public@example.invalid/1',
      defaultIntegrations: false,
      beforeSend: () => null,
    });
    const client = Sentry.getClient();
    expect(client?.getOptions().enabled).not.toBeFalse();

    // Act
    stopSentry();

    // Assert: synchronous, so withdrawn consent stops capture at once
    // and a later startSentry() sees a disabled client and re-initializes.
    expect(client?.getOptions().enabled).toBeFalse();
  });
});
