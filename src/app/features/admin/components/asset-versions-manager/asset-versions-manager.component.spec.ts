import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Subject, of, throwError } from 'rxjs';
import type { AssetLanguage } from '../../models/asset-content.models';
import type { AssetVersionsListResponse } from '../../models/asset-versions.models';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AssetContentService } from '../../services/asset-content.service';
import { AssetVersionsService } from '../../services/asset-versions.service';
import { AssetVersionsManagerComponent } from './asset-versions-manager.component';

const LANGUAGES: AssetLanguage[] = [
  { language: 'ar', is_source: true, is_available: true },
  { language: 'fr', is_source: false, is_available: false },
];

function page(language: string): AssetVersionsListResponse {
  return {
    results: [
      {
        id: 1,
        asset_id: 7,
        language,
        name: `v1 (${language})`,
        file_url: 'https://example.com/f',
        size_bytes: 1,
        created_at: '2026-01-01T00:00:00Z',
      },
    ],
    count: 1,
  };
}

describe('AssetVersionsManagerComponent', () => {
  let fixture: ComponentFixture<AssetVersionsManagerComponent>;
  let component: AssetVersionsManagerComponent;
  let versionsService: jasmine.SpyObj<AssetVersionsService>;
  let contentService: jasmine.SpyObj<AssetContentService>;
  let message: jasmine.SpyObj<NzMessageService>;

  beforeEach(async () => {
    versionsService = jasmine.createSpyObj<AssetVersionsService>('AssetVersionsService', [
      'list',
      'create',
      'update',
      'delete',
    ]);
    contentService = jasmine.createSpyObj<AssetContentService>('AssetContentService', [
      'listLanguages',
      'setLanguageAvailability',
      'versionDiff',
    ]);
    message = jasmine.createSpyObj<NzMessageService>('NzMessageService', [
      'success',
      'error',
      'warning',
    ]);

    contentService.listLanguages.and.returnValue(of(LANGUAGES));
    versionsService.list.and.returnValue(of(page('ar')));

    await TestBed.configureTestingModule({
      imports: [AssetVersionsManagerComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AssetVersionsService, useValue: versionsService },
        { provide: AssetContentService, useValue: contentService },
        { provide: NzMessageService, useValue: message },
        { provide: AdminAuthService, useValue: { hasPermission: () => true } },
      ],
    })
      // The behaviour under test is in the class; an empty template keeps the
      // spec free of the ng-zorro/icon setup the real markup needs.
      .overrideComponent(AssetVersionsManagerComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(AssetVersionsManagerComponent);
    component = fixture.componentInstance;
    component.kind = 'translation';
    component.slug = 'sahih-intl';
    component.assetId = 7;
    component.i18nPrefix = 'ADMIN.TRANSLATIONS.DETAIL.VERSIONS';
    component.sectionTitleKey = 'ADMIN.TRANSLATIONS.DETAIL.VERSIONS_TITLE';
  });

  describe('language-aware upload', () => {
    it('refuses to create a version while no language could be selected', () => {
      contentService.listLanguages.and.returnValue(of([]));
      fixture.detectChanges();

      component.openCreateModal();
      component.form.setValue({ name: 'v1', summary: 'first upload' });
      component.onPickFile({
        target: { files: [new File(['x'], 'v1.csv')], value: '' },
      } as unknown as Event);
      component.submit();

      expect(component.missingVersionLanguage()).toBeTrue();
      expect(versionsService.create).not.toHaveBeenCalled();
      expect(message.warning).toHaveBeenCalled();
    });

    it('creates the version once a language is available', () => {
      versionsService.create.and.returnValue(of(page('ar').results[0]));
      fixture.detectChanges();

      component.openCreateModal();
      component.form.setValue({ name: 'v1', summary: 'first upload' });
      component.onPickFile({
        target: { files: [new File(['x'], 'v1.csv')], value: '' },
      } as unknown as Event);
      component.submit();

      expect(component.missingVersionLanguage()).toBeFalse();
      expect(versionsService.create).toHaveBeenCalled();
    });
  });

  describe('version diff', () => {
    it('flags an error instead of reporting a failed diff as "no changes"', () => {
      contentService.versionDiff.and.returnValue(throwError(() => new Error('boom')));
      fixture.detectChanges();

      component.toggleDiff(page('ar').results[0]);

      expect(component.diffError()).toBeTrue();
      expect(component.diffLoading()).toBeFalse();
      expect(component.diff()).toEqual([]);
    });

    it('clears the error when a later diff loads', () => {
      contentService.versionDiff.and.returnValue(throwError(() => new Error('boom')));
      fixture.detectChanges();
      const row = page('ar').results[0];
      component.toggleDiff(row);
      component.toggleDiff(row); // collapse

      contentService.versionDiff.and.returnValue(of({ results: [], count: 0 }));
      component.toggleDiff(row);

      expect(component.diffError()).toBeFalse();
    });
  });

  describe('language filter', () => {
    it('ignores a stale response that arrives after a newer language was picked', () => {
      const first$ = new Subject<AssetVersionsListResponse>();
      const second$ = new Subject<AssetVersionsListResponse>();
      versionsService.list.and.returnValues(first$, second$);
      fixture.detectChanges(); // ngOnInit → loadLanguages → loadList (first$)

      component.onLanguageChange('fr'); // loadList (second$)
      second$.next(page('fr'));
      first$.next(page('ar')); // slow earlier request answering late

      expect(component.list()[0].language).toBe('fr');
      expect(component.loading()).toBeFalse();
    });
  });
});
