import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NzModalService } from 'ng-zorro-antd/modal';
import { throwError } from 'rxjs';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { AdminTenantService } from '../../../services/admin-tenant.service';
import { PublishersService } from '../../services/publishers.service';
import { PublisherDetailComponent } from './publisher-detail.component';

describe('PublisherDetailComponent', () => {
  let component: PublisherDetailComponent;
  let routerMock: jasmine.SpyObj<Router>;
  let publishersServiceMock: jasmine.SpyObj<PublishersService>;
  let tenantServiceMock: {
    getSelectedPublisherId: jasmine.Spy;
    publishers: ReturnType<
      typeof signal<{ id: number; name: string; slug: string; icon_url: null }[]>
    >;
  };

  beforeEach(() => {
    routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);
    publishersServiceMock = jasmine.createSpyObj<PublishersService>('PublishersService', [
      'getDetail',
    ]);
    publishersServiceMock.getDetail.and.returnValue(throwError(() => new Error('not found')));
    tenantServiceMock = {
      getSelectedPublisherId: jasmine.createSpy('getSelectedPublisherId').and.returnValue(456),
      publishers: signal([
        { id: 123, name: 'Old', slug: 'old', icon_url: null },
        { id: 456, name: 'New', slug: 'new', icon_url: null },
      ]),
    };

    TestBed.configureTestingModule({
      imports: [PublisherDetailComponent],
      providers: [
        { provide: Router, useValue: routerMock },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { params: { id: '123' } } },
        },
        { provide: PublishersService, useValue: publishersServiceMock },
        { provide: AdminTenantService, useValue: tenantServiceMock },
        {
          provide: AdminAuthService,
          useValue: jasmine.createSpyObj<AdminAuthService>('AdminAuthService', ['hasPermission']),
        },
        {
          provide: NzModalService,
          useValue: jasmine.createSpyObj<NzModalService>('NzModalService', ['confirm']),
        },
        {
          provide: TranslateService,
          useValue: jasmine.createSpyObj<TranslateService>('TranslateService', [
            'instant',
            'getCurrentLang',
          ]),
        },
      ],
    });

    TestBed.overrideComponent(PublisherDetailComponent, {
      set: { template: '' },
    });

    const fixture = TestBed.createComponent(PublisherDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('recovers to selected tenant publisher when detail load fails', () => {
    component.load();

    expect(routerMock.navigate).toHaveBeenCalledWith(['/admin/publishers', 456], {
      replaceUrl: true,
    });
  });
});
