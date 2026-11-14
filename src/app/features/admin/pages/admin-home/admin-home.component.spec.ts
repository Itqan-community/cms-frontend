import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of, throwError } from 'rxjs';
import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AssetCountsOut, AssetCountsService } from '../../services/asset-counts.service';
import { AdminHomeComponent } from './admin-home.component';

describe('AdminHomeComponent', () => {
  let hasPermission: jasmine.Spy;
  let isStaff: jasmine.Spy;
  let getCounts: jasmine.Spy<() => Observable<AssetCountsOut>>;

  beforeEach(() => {
    hasPermission = jasmine.createSpy('hasPermission').and.returnValue(false);
    isStaff = jasmine.createSpy('isStaff').and.returnValue(false);
    getCounts = jasmine
      .createSpy<() => Observable<AssetCountsOut>>('get')
      .and.returnValue(of({ categories: [] }));

    TestBed.configureTestingModule({
      imports: [AdminHomeComponent],
      providers: [
        {
          provide: AdminAuthService,
          useValue: { hasPermission, isStaff },
        },
        { provide: AssetCountsService, useValue: { get: getCounts } },
        {
          provide: TranslateService,
          useValue: {
            instant: (key: string) => key,
            getCurrentLang: () => 'en',
            currentLang: 'en',
            onLangChange: of({ lang: 'en' }),
          },
        },
      ],
    });

    TestBed.overrideComponent(AdminHomeComponent, {
      set: { template: '' },
    });
  });

  it('omits the home card and keeps issues visible without extra permissions', () => {
    const fixture = TestBed.createComponent(AdminHomeComponent);
    const sections = fixture.componentInstance.sections();

    expect(sections.map((section) => section.route)).toEqual(['/admin/issues']);
  });

  it('includes only modules the user can access', () => {
    hasPermission.and.callFake(
      (code: string) =>
        code === PORTAL_PERMISSIONS.PORTAL_READ_RECITATION ||
        code === PORTAL_PERMISSIONS.PORTAL_READ_USAGE
    );

    const fixture = TestBed.createComponent(AdminHomeComponent);
    const sections = fixture.componentInstance.sections();

    expect(sections.map((section) => section.route)).toEqual([
      '/admin/recitations',
      '/admin/issues',
      '/admin/usage',
    ]);
  });

  it('links each asset count to its portal list, keeping the text tag breakdown', () => {
    const tags = [
      { slug: 'tafsir', name: 'Tafsir', total: 3, drafts: 0 },
      { slug: 'translation', name: 'Translation', total: 5, drafts: 1 },
    ];
    getCounts.and.returnValue(
      of({
        categories: [
          { category: 'text', total: 8, drafts: 1, tags },
          { category: 'recitation', total: 2, drafts: 0, tags: [] },
        ],
      })
    );

    const fixture = TestBed.createComponent(AdminHomeComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(getCounts).toHaveBeenCalledTimes(1);
    expect(component.countsLoading()).toBeFalse();
    expect(
      component.assetCounts().map(({ category, route, labelKey, total, drafts }) => ({
        category,
        route,
        labelKey,
        total,
        drafts,
      }))
    ).toEqual([
      {
        category: 'text',
        route: '/admin/text-assets',
        labelKey: 'ADMIN.MENU.TEXT_ASSETS',
        total: 8,
        drafts: 1,
      },
      {
        category: 'recitation',
        route: '/admin/recitations',
        labelKey: 'ADMIN.MENU.RECITATIONS',
        total: 2,
        drafts: 0,
      },
    ]);
    expect(component.assetCounts()[0].tags).toEqual(tags);
  });

  it('shows the backend message inline when the counts fail to load', () => {
    getCounts.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 500,
            error: { error_name: 'counts_broken', message: 'The counts service is down.' },
          })
      )
    );
    spyOn(console, 'error');

    const fixture = TestBed.createComponent(AdminHomeComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.countsLoading()).toBeFalse();
    expect(component.countsError()).toBe('The counts service is down.');
    expect(component.assetCounts()).toEqual([]);
  });
});
