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

    expect(result.fetchedAny).toBeTrue();
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
});
