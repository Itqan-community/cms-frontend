import { convertToParamMap } from '@angular/router';
import type { ActivatedRoute } from '@angular/router';
import { buildHeadlessConnectOAuthCallbackUrl, buildHeadlessOAuthCallbackUrl } from './auth-route-query.util';

describe('auth-route-query.util (OAuth callback)', () => {
  it('buildHeadlessOAuthCallbackUrl preserves next query param', () => {
    spyOnProperty(window, 'location', 'get').and.returnValue({
      origin: 'https://cms.example',
    } as Location);

    const route = {
      snapshot: { queryParamMap: convertToParamMap({ next: '/custom' }) },
    } as ActivatedRoute;

    expect(buildHeadlessOAuthCallbackUrl(route)).toBe(
      'https://cms.example/account/provider/callback?next=%2Fcustom'
    );
  });

  it('buildHeadlessConnectOAuthCallbackUrl defaults next to providers page', () => {
    spyOnProperty(window, 'location', 'get').and.returnValue({
      origin: 'https://cms.example',
    } as Location);

    expect(buildHeadlessConnectOAuthCallbackUrl()).toBe(
      'https://cms.example/account/provider/callback?next=%2Faccount%2Fproviders'
    );
  });
});
