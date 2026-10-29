import { TestBed } from '@angular/core/testing';
import { consumeTenantSwitch } from '../utils/admin-tenant-navigation.util';
import { AdminTenantNavigationService } from './admin-tenant-navigation.service';

describe('AdminTenantNavigationService', () => {
  it('remembers the switch before reloading the page', () => {
    sessionStorage.clear();
    const service = TestBed.inject(AdminTenantNavigationService);
    const load = spyOn(service as unknown as { load: (url: string) => void }, 'load').and.stub();

    service.assign('/admin/members');

    expect(load).toHaveBeenCalledWith('/admin/members');
    expect(consumeTenantSwitch()).toBeTrue();
  });
});
