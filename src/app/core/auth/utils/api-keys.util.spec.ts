import { parseApiKeyCreated, parseApiKeysList } from './api-keys.util';

describe('api-keys.util', () => {
  it('parseApiKeysList accepts bare array rows', () => {
    const list = parseApiKeysList([
      {
        id: '1',
        name: 'Prod',
        masked_key: 'sk-xxxx',
        revoked: false,
        created_at: '2026-05-01T00:00:00Z',
        last_used_at: null,
      },
    ]);
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe('1');
    expect(list[0]?.maskedKey).toBe('sk-xxxx');
    expect(list[0]?.isRevoked).toBe(false);
    expect(list[0]?.createdAt).toBe('2026-05-01T00:00:00Z');
  });

  it('parseApiKeysList unwraps pagination-style envelope', () => {
    const list = parseApiKeysList({ results: [{ id: '9', name: 'Q', masked_key: 'ab' }] });
    expect(list[0]?.id).toBe('9');
  });

  it('parseApiKeyCreated extracts raw_key and summary', () => {
    const r = parseApiKeyCreated({
      id: 'a',
      name: 'K',
      masked_key: 'mk',
      revoked: false,
      raw_key: 'supersecret',
    });
    expect(r.rawKey).toBe('supersecret');
    expect(r.key.id).toBe('a');
    expect(r.key.name).toBe('K');
  });

  it('parseApiKeyCreated reads nested key object', () => {
    const r = parseApiKeyCreated({
      key: {
        id: 'b',
        name: 'N',
      },
      token: 't1',
    });
    expect(r.rawKey).toBe('t1');
    expect(r.key.id).toBe('b');
  });
});
