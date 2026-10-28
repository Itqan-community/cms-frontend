import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { rememberTenantSwitch } from '../utils/admin-tenant-navigation.util';
import { afterTenantSwitchGuard } from './after-tenant-switch.guard';

describe('afterTenantSwitchGuard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  const run = () =>
    TestBed.runInInjectionContext(() => afterTenantSwitchGuard(null as never, null as never));

  it('sends the user to the admin home when the page they were on is not allowed at the new publisher', () => {
    rememberTenantSwitch();

    const result = run() as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/admin');
  });

  it('shows the unauthorized page otherwise', () => {
    expect(run()).toBeTrue();
  });
});
