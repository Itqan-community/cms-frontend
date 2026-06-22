import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NzModalService } from 'ng-zorro-antd/modal';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/services/auth.service';
import { AdminLayoutComponent } from './admin-layout.component';
import { AdminTenantNavigationService } from './services/admin-tenant-navigation.service';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminTenantService } from './services/admin-tenant.service';

describe('AdminLayoutComponent', () => {
  let component: AdminLayoutComponent;
  let tenantServiceMock: {
    getSelectedPublisherId: jasmine.Spy;
    setSelectedPublisherId: jasmine.Spy;
    ensureReady: jasmine.Spy;
    publishers: ReturnType<typeof signal<unknown[]>>;
    selectedPublisherId: ReturnType<typeof signal<number | null>>;
    isLoading: ReturnType<typeof signal<boolean>>;
  };
  let routerMock: jasmine.SpyObj<Router>;
  let tenantNavigationMock: jasmine.SpyObj<AdminTenantNavigationService>;

  beforeEach(() => {
    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);
    Object.defineProperty(routerMock, 'url', {
      get: () => '/admin/publishers/123',
    });
    tenantNavigationMock = jasmine.createSpyObj<AdminTenantNavigationService>(
      'AdminTenantNavigationService',
      ['assign']
    );

    tenantServiceMock = {
      getSelectedPublisherId: jasmine.createSpy('getSelectedPublisherId').and.returnValue(123),
      setSelectedPublisherId: jasmine.createSpy('setSelectedPublisherId').and.returnValue(true),
      ensureReady: jasmine.createSpy('ensureReady').and.returnValue(of(true)),
      publishers: signal([]),
      selectedPublisherId: signal(123),
      isLoading: signal(false),
    };

    TestBed.configureTestingModule({
      imports: [AdminLayoutComponent],
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: AdminTenantService, useValue: tenantServiceMock },
        { provide: AdminTenantNavigationService, useValue: tenantNavigationMock },
        {
          provide: AdminAuthService,
          useValue: {
            hasPermission: () => true,
            isItqanAdmin: () => true,
          },
        },
        {
          provide: AuthService,
          useValue: jasmine.createSpyObj<AuthService>('AuthService', ['logout']),
        },
        {
          provide: NzModalService,
          useValue: jasmine.createSpyObj<NzModalService>('NzModalService', ['confirm']),
        },
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string) => key,
            getCurrentLang: () => 'en',
            onLangChange: of({ lang: 'en' }),
          },
        },
      ],
    });

    TestBed.overrideComponent(AdminLayoutComponent, {
      set: { template: '' },
    });

    const fixture = TestBed.createComponent(AdminLayoutComponent);
    component = fixture.componentInstance;
  });

  it('navigates to the new publisher detail when tenant changes on a detail route', () => {
    component.onTenantChange(456);

    expect(tenantServiceMock.setSelectedPublisherId).toHaveBeenCalledWith(456);
    expect(tenantNavigationMock.assign).toHaveBeenCalledWith('/admin/publishers/456');
  });

  it('links the publishers menu item to the selected publisher detail', () => {
    expect(
      component.tabRouterLink({ id: 'publishers', path: 'publishers', label: '', icon: '' })
    ).toEqual(['/admin', 'publishers', 123]);
  });

  it('keeps non-publisher menu items on their module routes', () => {
    expect(
      component.tabRouterLink({ id: 'members', path: 'members', label: '', icon: '' })
    ).toEqual(['/admin', 'members']);
  });

  it('does nothing when the selected tenant is unchanged', () => {
    component.onTenantChange(123);

    expect(tenantServiceMock.setSelectedPublisherId).not.toHaveBeenCalled();
    expect(tenantNavigationMock.assign).not.toHaveBeenCalled();
  });
});
