/**
 * Resolves the URL to load after the header tenant dropdown changes.
 * Publisher entity routes (detail/edit) must follow the newly selected publisher.
 */
export function resolveUrlAfterTenantChange(currentUrl: string, newPublisherId: number): string {
  const path = currentUrl.split('?')[0];
  const publisherEntity = /^\/admin\/publishers\/(\d+)(?:\/edit)?\/?$/;
  const match = publisherEntity.exec(path);
  if (path === '/admin/publishers' || (match && Number(match[1]) !== newPublisherId)) {
    return `/admin/publishers/${newPublisherId}`;
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
