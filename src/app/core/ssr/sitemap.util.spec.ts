import { buildSitemapXml, createCachedSitemapLoader } from './sitemap.util';

describe('sitemap.util', () => {
  it('builds valid hreflang XML without /publishers and encodes dynamic segments', async () => {
    const fetchMock = jasmine.createSpy('fetch').and.callFake((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/reciters/')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              count: 1,
              results: [{ slug: 'al afasy', updated_at: '2026-01-01' }],
            }),
            { status: 200 }
          )
        );
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            count: 1,
            results: [{ id: 12, publisher: { id: 'pub&1' } }],
          }),
          { status: 200 }
        )
      );
    });

    const result = await buildSitemapXml(
      'https://api.cms.itqan.dev/cms-api',
      'https://cms.itqan.dev',
      fetchMock as unknown as typeof fetch
    );

    expect(result.complete).toBeTrue();
    expect(result.xml).toContain('<loc>https://cms.itqan.dev/gallery</loc>');
    expect(result.xml).toContain('<loc>https://cms.itqan.dev/reciters/al%20afasy</loc>');
    expect(result.xml).toContain('<loc>https://cms.itqan.dev/gallery/asset/12?lang=en</loc>');
    expect(result.xml).toContain('<loc>https://cms.itqan.dev/publisher/pub%261</loc>');
    expect(result.xml).not.toContain('/publishers');
  });

  it('caches live responses within TTL and falls back to disk when initial fetch fails', async () => {
    let time = 1000;
    const okFetch = jasmine
      .createSpy('fetch')
      .and.callFake(() =>
        Promise.resolve(new Response(JSON.stringify({ count: 0, results: [] }), { status: 200 }))
      );

    const loader = createCachedSitemapLoader({
      apiBaseUrl: 'https://api.cms.itqan.dev/cms-api',
      siteUrl: 'https://cms.itqan.dev',
      ttlMs: 5000,
      now: () => time,
      fetchImpl: okFetch as unknown as typeof fetch,
    });

    const first = await loader.get();
    const second = await loader.get();
    expect(first).toBe(second);
    expect(okFetch).toHaveBeenCalledTimes(2); // 1 reciters + 1 assets

    time += 6000;
    await loader.get();
    expect(okFetch).toHaveBeenCalledTimes(4);

    const failingFetch = jasmine.createSpy('failFetch').and.rejectWith(new Error('offline'));
    const fallbackLoader = createCachedSitemapLoader({
      apiBaseUrl: 'https://api.cms.itqan.dev/cms-api',
      siteUrl: 'https://cms.itqan.dev',
      readFallback: () => '<urlset>fallback</urlset>',
      fetchImpl: failingFetch as unknown as typeof fetch,
    });

    spyOn(console, 'warn');
    expect(await fallbackLoader.get()).toBe('<urlset>fallback</urlset>');
  });

  it('keeps the complete cached sitemap when one endpoint fails on refresh', async () => {
    let time = 1000;
    let assetsUp = true;
    const fetchMock = jasmine.createSpy('fetch').and.callFake((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/assets/') && !assetsUp) {
        return Promise.resolve(new Response('', { status: 503 }));
      }
      const results = url.includes('/reciters/')
        ? [{ slug: 'afasy' }]
        : [{ id: 12, publisher: { id: 3 } }];
      return Promise.resolve(new Response(JSON.stringify({ count: 1, results }), { status: 200 }));
    });
    const loader = createCachedSitemapLoader({
      apiBaseUrl: 'https://api.cms.itqan.dev/cms-api',
      siteUrl: 'https://cms.itqan.dev',
      ttlMs: 5000,
      now: () => time,
      readFallback: () => '<urlset>fallback</urlset>',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    spyOn(console, 'warn');

    const complete = await loader.get();
    expect(complete).toContain('/gallery/asset/12');

    assetsUp = false;
    time += 6000;
    expect(await loader.get()).toBe(complete);
  });

  it('prefers the disk fallback over a partial sitemap when nothing is cached', async () => {
    const fetchMock = jasmine
      .createSpy('fetch')
      .and.callFake((input: RequestInfo | URL) =>
        String(input).includes('/assets/')
          ? Promise.resolve(new Response('', { status: 503 }))
          : Promise.resolve(
              new Response(JSON.stringify({ count: 0, results: [] }), { status: 200 })
            )
      );
    spyOn(console, 'warn');
    const withFallback = createCachedSitemapLoader({
      apiBaseUrl: 'https://api.cms.itqan.dev/cms-api',
      siteUrl: 'https://cms.itqan.dev',
      readFallback: () => '<urlset>fallback</urlset>',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(await withFallback.get()).toBe('<urlset>fallback</urlset>');

    const withoutFallback = createCachedSitemapLoader({
      apiBaseUrl: 'https://api.cms.itqan.dev/cms-api',
      siteUrl: 'https://cms.itqan.dev',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    expect(await withoutFallback.get()).toContain('<loc>https://cms.itqan.dev/gallery</loc>');
  });

  it('waits out the retry delay after a failed refresh instead of refetching on every request', async () => {
    let time = 1000;
    const failingFetch = jasmine.createSpy('fetch').and.rejectWith(new Error('offline'));
    const loader = createCachedSitemapLoader({
      apiBaseUrl: 'https://api.cms.itqan.dev/cms-api',
      siteUrl: 'https://cms.itqan.dev',
      retryDelayMs: 1000,
      now: () => time,
      readFallback: () => '<urlset>fallback</urlset>',
      fetchImpl: failingFetch as unknown as typeof fetch,
    });
    spyOn(console, 'warn');

    expect(await loader.get()).toBe('<urlset>fallback</urlset>');
    expect(await loader.get()).toBe('<urlset>fallback</urlset>');
    expect(failingFetch).toHaveBeenCalledTimes(2); // one attempt: reciters + assets

    time += 1500;
    await loader.get();
    expect(failingFetch).toHaveBeenCalledTimes(4);
  });
});
