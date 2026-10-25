/** Admin sections whose sub-routes are tabs, not records owned by a publisher. */
const TENANT_NEUTRAL_SECTIONS = new Set(['software']);

/**
 * Resolves the URL to load after the header tenant dropdown changes.
 * Publisher entity routes (detail/edit) must follow the newly selected publisher.
 * Any other record route (asset detail/edit/versions…) belongs to the previous
 * publisher and would 404, so it falls back to its section list.
 */
export function resolveUrlAfterTenantChange(currentUrl: string, newPublisherId: number): string {
  const path = currentUrl.split('?')[0];
  const publisherEntity = /^\/admin\/publishers\/(\d+)(?:\/edit)?\/?$/;
  const match = publisherEntity.exec(path);
  if (path === '/admin/publishers' || (match && Number(match[1]) !== newPublisherId)) {
    return `/admin/publishers/${newPublisherId}`;
  }
  const [, root, section, record] = path.split('/');
  if (
    root === 'admin' &&
    section !== 'publishers' &&
    record &&
    record !== 'create' &&
    !TENANT_NEUTRAL_SECTIONS.has(section)
  ) {
    return `/admin/${section}`;
  }
  return path || '/admin';
}

export function buildSelectedPublisherDetailCommands(
  selectedPublisherId: number | null
): (string | number)[] | null {
  if (selectedPublisherId == null) {
    return null;
  }
  return ['/admin', 'publishers', selectedPublisherId];
}

export function buildSelectedPublisherDetailPath(
  selectedPublisherId: number | null
): string | null {
  const commands = buildSelectedPublisherDetailCommands(selectedPublisherId);
  return commands ? commands.join('/') : null;
}

/**
 * When a publisher detail/edit load fails, returns the id to navigate to
 * if the route publisher does not match the current tenant selection.
 */
export function resolvePublisherDetailRecoveryId(
  routePublisherId: number,
  selectedPublisherId: number | null,
  accessiblePublisherIds: number[]
): number | null {
  if (
    selectedPublisherId != null &&
    routePublisherId !== selectedPublisherId &&
    accessiblePublisherIds.includes(selectedPublisherId)
  ) {
    return selectedPublisherId;
  }
  if (accessiblePublisherIds.length === 1 && accessiblePublisherIds[0] !== routePublisherId) {
    return accessiblePublisherIds[0];
  }
  return null;
}
