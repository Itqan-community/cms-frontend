import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { AdminSidebarComponent } from './admin-sidebar.component';
import { AdminAuthService } from '../services/admin-auth.service';
import { AdminTenantService } from '../services/admin-tenant.service';

describe('AdminSidebarComponent', () => {
  let component: AdminSidebarComponent;
  let tenantServiceMock: {
    getSelectedPublisherId: jasmine.Spy;
    setSelectedPublisherId: jasmine.Spy;
    ensureReady: jasmine.Spy;
    publishers: ReturnType<typeof signal<unknown[]>>;
    selectedPublisherId: ReturnType<typeof signal<number | null>>;
    isLoading: ReturnType<typeof signal<boolean>>;
  };

  beforeEach(() => {
    tenantServiceMock = {
      getSelectedPublisherId: jasmine.createSpy('getSelectedPublisherId').and.returnValue(123),
      setSelectedPublisherId: jasmine.createSpy('setSelectedPublisherId').and.returnValue(true),
      ensureReady: jasmine.createSpy('ensureReady').and.returnValue(of(true)),
      publishers: signal([]),
      selectedPublisherId: signal(123),
      isLoading: signal(false),
    };

    TestBed.configureTestingModule({
      imports: [AdminSidebarComponent],
      providers: [
        { provide: AdminTenantService, useValue: tenantServiceMock },
        {
          provide: AdminAuthService,
          useValue: {
            hasPermission: () => true,
            isItqanAdmin: () => true,
          },
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

    TestBed.overrideComponent(AdminSidebarComponent, {
      set: { template: '' },
    });

    const fixture = TestBed.createComponent(AdminSidebarComponent);
    component = fixture.componentInstance;

    // Set required model inputs
    fixture.componentRef.setInput('isCollapsed', false);
    fixture.componentRef.setInput('isMobileMenuOpen', false);

    fixture.detectChanges();
  });

  it('links the publishers menu item to the selected publisher detail', () => {
    expect(
      component.tabRouterLink({
        id: 'publishers',
        path: 'publishers',
        label: '',
        icon: '',
        description: '',
      })
    ).toEqual(['/admin', 'publishers', 123]);
  });

  it('keeps non-publisher menu items on their module routes', () => {
    expect(
      component.tabRouterLink({
        id: 'members',
        path: 'members',
        label: '',
        icon: '',
        description: '',
      })
    ).toEqual(['/admin', 'members']);
  });

  it('links the home tab to the admin root', () => {
    expect(
      component.tabRouterLink({
        id: 'home',
        path: '',
        label: '',
        icon: '',
        description: '',
      })
    ).toEqual(['/admin']);
  });
});
