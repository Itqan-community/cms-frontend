import {
  CHUNK_LOAD_RECOVERY_FLAG,
  isChunkLoadError,
  tryRecoverFromChunkLoadError,
} from './chunk-load-error.util';

describe('chunk-load-error.util', () => {
  describe('isChunkLoadError', () => {
    it('matches WebKit module script failure', () => {
      expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true);
    });

    it('matches webpack ChunkLoadError', () => {
      const err = new Error(
        'Loading chunk 22S5FMW7 failed.\n(error: https://cms.itqan.dev/chunk-22S5FMW7.js)'
      );
      err.name = 'ChunkLoadError';
      expect(isChunkLoadError(err)).toBe(true);
    });

    it('matches failed dynamic import message', () => {
      expect(
        isChunkLoadError(
          new TypeError('Failed to fetch dynamically imported module: https://x/a.js')
        )
      ).toBe(true);
    });

    it('rejects unrelated errors', () => {
      expect(isChunkLoadError(new Error('NullInjectorError'))).toBe(false);
      expect(isChunkLoadError(null)).toBe(false);
    });
  });

  describe('tryRecoverFromChunkLoadError', () => {
    let storage: Storage;
    let store: Record<string, string>;
    let reload: jasmine.Spy;

    beforeEach(() => {
      store = {};
      storage = {
        getItem: (k: string) => (k in store ? store[k] : null),
        setItem: (k: string, v: string) => {
          store[k] = String(v);
        },
        removeItem: (k: string) => {
          delete store[k];
        },
        clear: () => {
          store = {};
        },
        key: () => null,
        length: 0,
      };
      reload = jasmine.createSpy('reload');
    });

    it('reloads once and sets the recovery flag', () => {
      const err = new TypeError('Importing a module script failed.');
      expect(tryRecoverFromChunkLoadError(err, storage, reload)).toBe(true);
      expect(reload).toHaveBeenCalledTimes(1);
      expect(storage.getItem(CHUNK_LOAD_RECOVERY_FLAG)).toBe('1');
    });

    it('does not reload when the flag is already set', () => {
      storage.setItem(CHUNK_LOAD_RECOVERY_FLAG, '1');
      const err = new TypeError('Importing a module script failed.');
      expect(tryRecoverFromChunkLoadError(err, storage, reload)).toBe(false);
      expect(reload).not.toHaveBeenCalled();
    });

    it('returns false for non-chunk errors', () => {
      expect(tryRecoverFromChunkLoadError(new Error('boom'), storage, reload)).toBe(false);
      expect(reload).not.toHaveBeenCalled();
    });
  });
});
