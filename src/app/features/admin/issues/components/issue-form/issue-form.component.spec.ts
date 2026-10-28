import { signal } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { of } from 'rxjs';
import { AssetsService } from '../../../../gallery/services/assets.service';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { AdminTenantService } from '../../../services/admin-tenant.service';
import { IssuesService } from '../../services/issues.service';
import { IssueFormComponent } from './issue-form.component';

describe('IssueFormComponent', () => {
  const isStaff = signal(false);
  const selectedPublisherId = signal<number | null>(7);
  let getAssets: jasmine.Spy;

  beforeEach(() => {
    isStaff.set(false);
    selectedPublisherId.set(7);
    getAssets = jasmine.createSpy('getAssets').and.returnValue(of({ results: [] }));
    TestBed.configureTestingModule({
      imports: [IssueFormComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: new Map(), routeConfig: { path: 'new' } } },
        },
        { provide: AssetsService, useValue: { getAssets } },
        { provide: IssuesService, useValue: {} },
        {
          provide: NzMessageService,
          useValue: jasmine.createSpyObj('NzMessageService', ['error', 'success']),
        },
        { provide: AdminAuthService, useValue: { isStaff } },
        { provide: AdminTenantService, useValue: { selectedPublisherId } },
      ],
    });
  });

  function search(query: string): void {
    const component = TestBed.createComponent(IssueFormComponent).componentInstance;
    component.ngOnInit();
    component.onAssetSearch(query);
    tick(300);
  }

  it("searches only the selected publisher's assets for publisher users", fakeAsync(() => {
    // Act
    search('mushaf');

    // Assert
    expect(getAssets).toHaveBeenCalledWith([], 'mushaf', [], 7);
  }));

  it('searches every publisher’s assets for Itqan staff', fakeAsync(() => {
    // Arrange
    isStaff.set(true);

    // Act
    search('mushaf');

    // Assert
    expect(getAssets).toHaveBeenCalledWith([], 'mushaf', [], null);
  }));
});
