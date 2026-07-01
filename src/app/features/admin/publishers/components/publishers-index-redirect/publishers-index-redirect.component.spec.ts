import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AdminTenantService } from '../../../services/admin-tenant.service';
import { PublishersIndexRedirectComponent } from './publishers-index-redirect.component';

describe('PublishersIndexRedirectComponent', () => {
  let routerMock: jasmine.SpyObj<Router>;
  let tenantServiceMock: { getSelectedPublisherId: jasmine.Spy };

  beforeEach(() => {
    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);
    tenantServiceMock = {
      getSelectedPublisherId: jasmine.createSpy('getSelectedPublisherId').and.returnValue(10),
    };

    TestBed.configureTestingModule({
      imports: [PublishersIndexRedirectComponent],
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: AdminTenantService, useValue: tenantServiceMock },
      ],
    });
  });

  it('redirects to the selected publisher detail page', () => {
    const fixture = TestBed.createComponent(PublishersIndexRedirectComponent);
    fixture.detectChanges();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin', 'publishers', 10], {
      replaceUrl: true,
    });
  });
});
