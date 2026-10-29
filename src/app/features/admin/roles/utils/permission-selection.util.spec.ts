import {
  explicitFromSaved,
  includedPermissions,
  togglePermission,
  type ImpliesMap,
} from './permission-selection.util';

// Mirrors the backend: CREATE and UPDATE imply each other and READ; DELETE implies all three.
const IMPLIES: ImpliesMap = new Map([
  ['read', []],
  ['create', ['read', 'update']],
  ['update', ['read', 'create']],
  ['delete', ['read', 'create', 'update']],
  ['timing', ['update', 'create', 'read']],
  ['access', []],
]);
const ORDER = ['access', 'read', 'create', 'update', 'delete', 'timing'];

describe('permission selection', () => {
  it('includes everything a selected permission implies', () => {
    expect([...includedPermissions(['delete'], IMPLIES)].sort()).toEqual([
      'create',
      'delete',
      'read',
      'update',
    ]);
  });

  it('ticking a permission keeps only the strongest explicit choices', () => {
    const explicit = togglePermission(['read'], 'delete', true, IMPLIES, ORDER);

    expect(explicit).toEqual(['delete']);
  });

  it('ticking one of a mutually implied pair locks the other instead of both', () => {
    const explicit = togglePermission([], 'create', true, IMPLIES, ORDER);

    expect(explicit).toEqual(['create']);
    expect(includedPermissions(explicit, IMPLIES).has('update')).toBeTrue();
  });

  it('unticking an explicit permission releases what only it implied', () => {
    const explicit = togglePermission(['create', 'access'], 'create', false, IMPLIES, ORDER);

    expect(explicit).toEqual(['access']);
    expect(includedPermissions(explicit, IMPLIES).has('read')).toBeFalse();
  });

  it('restores the strongest permissions as explicit when loading a saved role', () => {
    expect(
      explicitFromSaved(['read', 'create', 'update', 'delete', 'access'], IMPLIES, ORDER)
    ).toEqual(['delete', 'access']);
  });

  it('picks the first of a mutually implied pair in catalogue order when loading', () => {
    expect(explicitFromSaved(['read', 'update', 'create'], IMPLIES, ORDER)).toEqual(['create']);
  });

  it('keeps a stronger permission explicit when it was chosen alongside a weaker one', () => {
    expect(explicitFromSaved(['timing', 'update', 'create', 'read'], IMPLIES, ORDER)).toEqual([
      'timing',
    ]);
  });
});
