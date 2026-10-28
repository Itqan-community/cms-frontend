import { signal } from '@angular/core';
import { PORTAL_PERMISSIONS } from '../constants/portal-permission.constants';
import { buildAuthorizedAdminTabs, TAB_ROLES } from './admin-sidebar.component';

describe('buildAuthorizedAdminTabs roles tab', () => {
  const tabsFor = (codes: string[]) =>
    buildAuthorizedAdminTabs({
      hasPermission: (code: string) => codes.includes(code),
      isItqanAdmin: signal(false),
    });

  it('shows the roles tab to users who can read groups', () => {
    expect(tabsFor([PORTAL_PERMISSIONS.PORTAL_READ_GROUP])).toContain(TAB_ROLES);
  });

  it('hides the roles tab from everyone else', () => {
    expect(tabsFor([PORTAL_PERMISSIONS.PORTAL_VIEW_PUBLISHER_MEMBERS])).not.toContain(TAB_ROLES);
  });
});
