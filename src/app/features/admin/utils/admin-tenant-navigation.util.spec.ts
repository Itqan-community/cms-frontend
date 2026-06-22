import {
  buildSelectedPublisherDetailCommands,
  resolvePublisherDetailRecoveryId,
  resolveUrlAfterTenantChange,
} from './admin-tenant-navigation.util';

describe('resolveUrlAfterTenantChange', () => {
  it('redirects publisher detail to the newly selected publisher', () => {
    expect(resolveUrlAfterTenantChange('/admin/publishers/123', 456)).toBe('/admin/publishers/456');
  });

  it('redirects publisher edit to the newly selected publisher detail', () => {
    expect(resolveUrlAfterTenantChange('/admin/publishers/123/edit', 456)).toBe(
      '/admin/publishers/456'
    );
  });

  it('redirects the publishers index to the newly selected publisher detail', () => {
    expect(resolveUrlAfterTenantChange('/admin/publishers', 456)).toBe('/admin/publishers/456');
  });

  it('keeps the create route unchanged', () => {
    expect(resolveUrlAfterTenantChange('/admin/publishers/create', 456)).toBe(
      '/admin/publishers/create'
    );
  });

  it('keeps non-publisher admin routes unchanged', () => {
    expect(resolveUrlAfterTenantChange('/admin/members', 456)).toBe('/admin/members');
  });

  it('redirects the publishers index with query params to the newly selected publisher detail', () => {
    expect(resolveUrlAfterTenantChange('/admin/publishers?page=2', 456)).toBe(
      '/admin/publishers/456'
    );
  });

  it('does not redirect when the route already matches the selected publisher', () => {
    expect(resolveUrlAfterTenantChange('/admin/publishers/456', 456)).toBe('/admin/publishers/456');
  });
});

describe('buildSelectedPublisherDetailCommands', () => {
  it('returns detail route commands for a selected publisher', () => {
    expect(buildSelectedPublisherDetailCommands(42)).toEqual(['/admin', 'publishers', 42]);
  });

  it('returns null when no publisher is selected', () => {
    expect(buildSelectedPublisherDetailCommands(null)).toBeNull();
  });
});

describe('resolvePublisherDetailRecoveryId', () => {
  it('returns selected tenant id when route id mismatches', () => {
    expect(resolvePublisherDetailRecoveryId(123, 456, [123, 456])).toBe(456);
  });

  it('returns sole accessible publisher for single-scope users', () => {
    expect(resolvePublisherDetailRecoveryId(999, null, [10])).toBe(10);
  });

  it('returns null when route id matches selected tenant', () => {
    expect(resolvePublisherDetailRecoveryId(456, 456, [123, 456])).toBeNull();
  });

  it('returns null when there is no valid recovery target', () => {
    expect(resolvePublisherDetailRecoveryId(999, null, [123, 456])).toBeNull();
  });
});
