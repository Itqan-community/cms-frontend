import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { type ModalOptions, NzModalService } from 'ng-zorro-antd/modal';
import { Subject, of, throwError } from 'rxjs';
import type {
  AssetLanguage,
  ContentChange,
  ContentDraftVersion,
} from '../../models/asset-content.models';
import type { AssetVersion, AssetVersionsListResponse } from '../../models/asset-versions.models';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AssetContentService } from '../../services/asset-content.service';
import { AssetVersionsService } from '../../services/asset-versions.service';
import { LastActiveLanguageService } from '../../services/last-active-language.service';
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
  /** Permissions the user holds; `null` grants everything. */
  let granted: Set<string> | null;
  let fixture: ComponentFixture<AssetVersionsManagerComponent>;
  let component: AssetVersionsManagerComponent;
  let versionsService: jasmine.SpyObj<AssetVersionsService>;
  let contentService: jasmine.SpyObj<AssetContentService>;
  let message: jasmine.SpyObj<NzMessageService>;
  let lastLanguage: jasmine.SpyObj<LastActiveLanguageService>;
  let modal: jasmine.SpyObj<NzModalService>;

  beforeEach(() => {
    granted = null;
  });

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
      'setPublishedVersion',
    ]);
    modal = jasmine.createSpyObj<NzModalService>('NzModalService', ['confirm']);
    // Confirm immediately, as if the user clicked OK; the rejection a failed action
    // returns is the modal's to handle.
    modal.confirm.and.callFake(((options?: ModalOptions) => {
      const onOk = options?.nzOnOk as (() => Promise<void>) | undefined;
      onOk?.().catch(() => undefined);
      return {};
    }) as unknown as NzModalService['confirm']);
    message = jasmine.createSpyObj<NzMessageService>('NzMessageService', [
      'success',
      'error',
      'warning',
    ]);

    lastLanguage = jasmine.createSpyObj<LastActiveLanguageService>('LastActiveLanguageService', [
      'get',
      'set',
    ]);
    // Backed by sessionStorage in production; stubbed so one test's choice cannot leak into the
    // next and so the no-remembered-language path is the default under test.
    lastLanguage.get.and.returnValue(null);

    contentService.listLanguages.and.returnValue(of(LANGUAGES));
    versionsService.list.and.returnValue(of(page('ar')));

    await TestBed.configureTestingModule({
      imports: [AssetVersionsManagerComponent, TranslateModule.forRoot()],
      providers: [
        // The component injects HttpClient directly for its own file requests.
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AssetVersionsService, useValue: versionsService },
        { provide: AssetContentService, useValue: contentService },
        { provide: NzMessageService, useValue: message },
        { provide: LastActiveLanguageService, useValue: lastLanguage },
        {
          provide: AdminAuthService,
          useValue: { hasPermission: (perm: string) => granted === null || granted.has(perm) },
        },
      ],
    })
      // The behaviour under test is in the class; an empty template keeps the
      // spec free of the ng-zorro/icon setup the real markup needs.
      .overrideComponent(AssetVersionsManagerComponent, { set: { template: '' } })
      // NzModalModule provides its own NzModalService, which a root provider would not replace.
      .overrideProvider(NzModalService, { useValue: modal })
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

  describe('default language', () => {
    it('defaults to the source language even when a translation is listed first', () => {
      // LANGUAGES has the source first, so a `langs[0]` fallback passes by luck; reverse it.
      contentService.listLanguages.and.returnValue(
        of([
          { language: 'fr', is_source: false, is_available: false },
          { language: 'ar', is_source: true, is_available: true },
        ])
      );

      fixture.detectChanges();

      expect(component.selectedLanguage()).toBe('ar');
      component.openCreateModal();
      expect(component.versionLanguage()).toBe('ar');
    });

    it('still prefers a remembered language over the source', () => {
      lastLanguage.get.and.returnValue('fr');
      fixture.detectChanges();

      expect(component.selectedLanguage()).toBe('fr');
    });

    it('falls back to the first entry when no language is the source', () => {
      contentService.listLanguages.and.returnValue(
        of([
          { language: 'fr', is_source: false, is_available: false },
          { language: 'de', is_source: false, is_available: false },
        ])
      );

      fixture.detectChanges();

      expect(component.selectedLanguage()).toBe('fr');
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

    it('shows the first page of a large diff while the rest is still loading', () => {
      const added = (id: number): ContentChange => ({
        unit_type: 'ayah',
        unit_id: id,
        label: `1:${id}`,
        change_type: 'added',
        old_text: '',
        new_text: `text ${id}`,
      });
      const secondPage$ = new Subject<{ results: ContentChange[]; count: number }>();
      contentService.versionDiff.and.returnValues(
        of({ results: [added(1), added(2)], count: 3 }),
        secondPage$
      );
      fixture.detectChanges();

      component.toggleDiff(page('ar').results[0]);

      expect(component.diffLoading()).toBeFalse();
      expect(component.diffLoadingMore()).toBeTrue();
      expect(component.diff().length).toBe(2);

      secondPage$.next({ results: [added(3)], count: 3 });

      expect(component.diffLoadingMore()).toBeFalse();
      expect(component.diff().map((c) => c.unit_id)).toEqual([1, 2, 3]);
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

  describe('content permission', () => {
    function withPermissions(...perms: string[]): void {
      granted = new Set(perms);
      fixture.detectChanges();
    }

    it('keeps uploading and restoring for users who can edit the content', () => {
      withPermissions(
        PORTAL_PERMISSIONS.PORTAL_UPDATE_TRANSLATION,
        PORTAL_PERMISSIONS.PORTAL_EDIT_TRANSLATION_CONTENT
      );

      component.openCreateModal();

      expect(component.canEditContent()).toBeTrue();
      expect(component.versionModalOpen()).toBeTrue();
    });

    it('lets metadata-only editors rename versions but not upload, replace files or restore', () => {
      withPermissions(PORTAL_PERMISSIONS.PORTAL_UPDATE_TRANSLATION);

      component.openCreateModal();

      expect(component.canEditContent()).toBeFalse();
      expect(component.canMutateVersions()).toBeTrue();
      expect(component.versionModalOpen()).toBeFalse();
    });
  });

  describe('language availability', () => {
    it('lets the source language be shown or hidden too', () => {
      granted = new Set([PORTAL_PERMISSIONS.PORTAL_UPDATE_TRANSLATION]);
      fixture.detectChanges();

      component.onLanguageChange('ar'); // the source
      expect(component.selectedLanguageObj()?.is_source).toBeTrue();
      expect(component.canToggleAvailability()).toBeTrue();
    });

    it('needs the update permission to toggle', () => {
      granted = new Set<string>();
      fixture.detectChanges();

      expect(component.canToggleAvailability()).toBeFalse();
    });
  });

  describe('publishing', () => {
    function version(overrides: Partial<AssetVersion>): AssetVersion {
      return { ...page('ar').results[0], ...overrides };
    }

    function withPermissions(...perms: string[]): void {
      granted = new Set(perms);
      fixture.detectChanges();
    }

    it('lets only holders of the publish permission publish', () => {
      withPermissions(PORTAL_PERMISSIONS.PORTAL_REVIEW_CONTENT);

      expect(component.canPublish()).toBeFalse();
    });

    it('does not offer publishing for assets without reviewed content', () => {
      component.kind = 'mushaf';
      withPermissions(PORTAL_PERMISSIONS.PORTAL_PUBLISH_CONTENT);

      expect(component.canPublish()).toBeFalse();
    });

    it('publishes an approved version and reloads the list', () => {
      withPermissions(PORTAL_PERMISSIONS.PORTAL_PUBLISH_CONTENT);
      contentService.setPublishedVersion.and.returnValue(of({} as ContentDraftVersion));
      versionsService.list.calls.reset();

      component.publishVersion(version({ id: 3, is_approved: true }));

      expect(contentService.setPublishedVersion).toHaveBeenCalledWith(
        'translation',
        'sahih-intl',
        3
      );
      expect(message.success).toHaveBeenCalled();
      expect(versionsService.list).toHaveBeenCalled();
      expect(component.publishingId()).toBeNull();
    });

    it('refuses to publish a version with unapproved changes', () => {
      withPermissions(PORTAL_PERMISSIONS.PORTAL_PUBLISH_CONTENT);

      component.publishVersion(version({ id: 3, is_approved: false, pending_review_count: 2 }));

      expect(modal.confirm).not.toHaveBeenCalled();
      expect(contentService.setPublishedVersion).not.toHaveBeenCalled();
    });

    it('explains when the server reports unapproved changes', () => {
      withPermissions(PORTAL_PERMISSIONS.PORTAL_PUBLISH_CONTENT);
      contentService.setPublishedVersion.and.returnValue(
        throwError(
          () =>
            new HttpErrorResponse({ status: 400, error: { error_name: 'version_not_approved' } })
        )
      );

      component.publishVersion(version({ id: 3, is_approved: true }));

      expect(message.error).toHaveBeenCalledWith('ADMIN.VERSION_PUBLISHING.NOT_APPROVED_ERROR');
      expect(component.publishingId()).toBeNull();
    });
  });

  describe('upload rejections', () => {
    it('explains an upload whose file cannot be read as content rows', () => {
      versionsService.create.and.returnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { error_name: 'content_file_unparseable' },
            })
        )
      );
      fixture.detectChanges();

      component.openCreateModal();
      component.form.setValue({ name: 'v2', summary: 'upload' });
      component.onPickFile({
        target: { files: [new File(['x'], 'v2.pdf')], value: '' },
      } as unknown as Event);
      component.submit();

      expect(message.error).toHaveBeenCalledWith('ADMIN.VERSION_PUBLISHING.FILE_UNPARSEABLE_ERROR');
    });
  });
});
