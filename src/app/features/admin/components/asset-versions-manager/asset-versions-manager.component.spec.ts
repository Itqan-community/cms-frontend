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
      'latestNumber',
      'create',
      'update',
      'delete',
      'removePackageVersion',
      'reinstatePackageVersion',
      'setPublishedVersion',
    ]);
    contentService = jasmine.createSpyObj<AssetContentService>('AssetContentService', [
      'listLanguages',
      'setLanguageAvailability',
      'versionDiff',
      'setPublishedVersion',
      'restoreVersion',
    ]);
    modal = jasmine.createSpyObj<NzModalService>('NzModalService', ['confirm']);
    // Confirm immediately, as if the user clicked OK.
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
    // An upload numbers after its language's latest version unless that language has none.
    versionsService.latestNumber.and.returnValue(of('1.0'));

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
      component.form.patchValue({ label_en: 'v1', summary_en: 'first upload' });
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
      component.form.patchValue({ label_en: 'v1', summary_en: 'first upload' });
      component.onPickFile({
        target: { files: [new File(['x'], 'v1.csv')], value: '' },
      } as unknown as Event);
      component.submit();

      expect(component.missingVersionLanguage()).toBeFalse();
      expect(versionsService.create).toHaveBeenCalled();
    });
  });

  describe('pre-approved upload', () => {
    function uploadWith(preApproved: boolean): void {
      versionsService.create.and.returnValue(of(page('ar').results[0]));
      fixture.detectChanges();
      component.openCreateModal();
      component.form.patchValue({ label_en: 'v1', summary_en: 'first upload' });
      component.onPickFile({
        target: { files: [new File(['x'], 'v1.csv')], value: '' },
      } as unknown as Event);
      component.preApproved.set(preApproved);
      component.submit();
    }

    it('asks the server to approve the upload when a reviewer ticks it', () => {
      uploadWith(true);

      expect(versionsService.create.calls.mostRecent().args[2].pre_approved).toBeTrue();
    });

    it('leaves the upload for review when it is not ticked', () => {
      uploadWith(false);

      expect(versionsService.create.calls.mostRecent().args[2].pre_approved).toBeUndefined();
    });

    it('never sends it for a user who cannot review', () => {
      granted = new Set([PORTAL_PERMISSIONS.PORTAL_EDIT_TRANSLATION_CONTENT]);

      uploadWith(true);

      expect(component.canReview()).toBeFalse();
      expect(versionsService.create.calls.mostRecent().args[2].pre_approved).toBeUndefined();
    });

    it('starts unticked each time the upload form opens', () => {
      fixture.detectChanges();
      component.openCreateModal();
      component.preApproved.set(true);
      component.closeVersionModal();

      component.openCreateModal();

      expect(component.preApproved()).toBeFalse();
    });
  });

  describe('bilingual name and summary', () => {
    it('needs a summary in at least one language', () => {
      fixture.detectChanges();
      component.openCreateModal();

      component.form.patchValue({ summary_en: '', summary_ar: '' });
      expect(component.form.hasError('summaryRequired')).toBeTrue();

      component.form.patchValue({ summary_ar: 'ملخص' });
      expect(component.form.hasError('summaryRequired')).toBeFalse();
    });

    it('uploads the name and summary in both languages, without the single summary', () => {
      versionsService.create.and.returnValue(of(page('ar').results[0]));
      fixture.detectChanges();
      component.openCreateModal();
      component.form.patchValue({
        label_en: ' First ',
        label_ar: 'الأولى',
        summary_en: '',
        summary_ar: 'ملخص',
      });
      component.onPickFile({
        target: { files: [new File(['x'], 'v1.csv')], value: '' },
      } as unknown as Event);

      component.submit();

      const payload = versionsService.create.calls.mostRecent().args[2];
      expect(payload).toEqual(
        jasmine.objectContaining({
          label_en: 'First',
          label_ar: 'الأولى',
          summary_en: '',
          summary_ar: 'ملخص',
        })
      );
      expect(payload.summary).toBeUndefined();
    });

    it('prefills both languages when editing', () => {
      fixture.detectChanges();

      component.openEditModal({
        ...page('ar').results[0],
        label_en: 'First',
        label_ar: 'الأولى',
        summary_en: 'notes',
        summary_ar: 'ملاحظات',
      });

      expect(component.form.getRawValue()).toEqual(
        jasmine.objectContaining({
          label_en: 'First',
          label_ar: 'الأولى',
          summary_en: 'notes',
          summary_ar: 'ملاحظات',
        })
      );
    });

    it('lists each version in the UI language, falling back to the other', () => {
      fixture.detectChanges();
      const version = {
        ...page('ar').results[0],
        label_en: '',
        label_ar: 'الأولى',
        summary_en: 'notes',
      };

      expect(component.versionText(version, 'label')).toBe('الأولى');
      expect(component.versionText(version, 'summary')).toBe('notes');
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
        column: 'text',
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

    it('does not offer publishing for programs, which serve their newest version', () => {
      component.kind = 'program';
      withPermissions(PORTAL_PERMISSIONS.PORTAL_PUBLISH_CONTENT);

      expect(component.supportsPublishing()).toBeFalse();
      expect(component.canPublish()).toBeFalse();
    });

    it('offers publishing mushafs and fonts without a review step', () => {
      component.kind = 'mushaf';
      withPermissions(PORTAL_PERMISSIONS.PORTAL_PUBLISH_CONTENT);

      expect(component.canPublish()).toBeTrue();
      expect(component.publishable(version({ is_approved: undefined }))).toBeTrue();
    });

    it('shows the publish button disabled, explaining the permission, to users who cannot publish', () => {
      withPermissions(PORTAL_PERMISSIONS.PORTAL_UPDATE_TRANSLATION);

      expect(component.supportsPublishing()).toBeTrue();
      expect(component.canPublish()).toBeFalse();
      expect(component.publishTooltip(version({ is_approved: true }))).toBe(
        'ADMIN.VERSION_PUBLISHING.TOOLTIP_NO_PERMISSION'
      );
    });

    it('publishes a mushaf version through the mushaf versions API', () => {
      component.kind = 'mushaf';
      versionsService.setPublishedVersion.and.returnValue(of(page('ar').results[0]));
      withPermissions(PORTAL_PERMISSIONS.PORTAL_PUBLISH_CONTENT);

      component.publishVersion(version({ id: 3 }));

      expect(versionsService.setPublishedVersion).toHaveBeenCalledWith(
        'mushaf',
        'sahih-intl',
        3,
        ''
      );
      expect(contentService.setPublishedVersion).not.toHaveBeenCalled();
    });

    it('publishes an approved version and reloads the list', () => {
      withPermissions(PORTAL_PERMISSIONS.PORTAL_PUBLISH_CONTENT);
      contentService.setPublishedVersion.and.returnValue(of({} as ContentDraftVersion));
      versionsService.list.calls.reset();

      component.publishVersion(version({ id: 3, is_approved: true }));

      expect(contentService.setPublishedVersion).toHaveBeenCalledWith(
        'translation',
        'sahih-intl',
        3,
        ''
      );
      expect(message.success).toHaveBeenCalled();
      expect(versionsService.list).toHaveBeenCalled();
      expect(component.publishingId()).toBeNull();
    });

    it('explains why a version cannot be published', () => {
      expect(component.publishTooltip(version({ is_approved: true }))).toBe(
        'ADMIN.VERSION_PUBLISHING.TOOLTIP_PUBLISH'
      );
      expect(component.publishTooltip(version({ is_approved: false }))).toBe(
        'ADMIN.VERSION_PUBLISHING.TOOLTIP_NOT_APPROVED'
      );
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

  describe('version numbering', () => {
    function pickFile(): void {
      component.onPickFile({
        target: { files: [new File(['x'], 'v.csv')], value: '' },
      } as unknown as Event);
    }

    it('asks for a starting number when the language has no versions yet', () => {
      versionsService.latestNumber.and.returnValue(of(null));
      versionsService.create.and.returnValue(of(page('ar').results[0]));
      fixture.detectChanges();

      component.openCreateModal();
      component.form.patchValue({ label_en: 'First edition', summary_en: 'first' });
      pickFile();
      component.submit();

      expect(component.versionNumberIncomplete()).toBeTrue();
      expect(versionsService.create).not.toHaveBeenCalled();

      component.versionStart.set('7.0');
      component.submit();

      expect(versionsService.create).toHaveBeenCalledWith(
        'translation',
        'sahih-intl',
        jasmine.objectContaining({
          label_en: 'First edition',
          version_number: '7.0',
          bump: 'minor',
        })
      );
    });

    it('sends the chosen bump, not a number, once the language has versions', () => {
      versionsService.create.and.returnValue(of(page('ar').results[0]));
      fixture.detectChanges();

      component.openCreateModal();
      component.form.patchValue({ label_en: '', summary_en: 'next' });
      component.versionBump.set('major');
      pickFile();
      component.submit();

      const payload = versionsService.create.calls.mostRecent().args[2];
      expect(payload.bump).toBe('major');
      expect(payload.version_number).toBeUndefined();
      expect(payload.name).toBeUndefined();
    });

    it('never sends the version number when editing', () => {
      versionsService.update.and.returnValue(of(page('ar').results[0]));
      fixture.detectChanges();

      component.openEditModal({ ...page('ar').results[0], name: '7.1', label_en: 'Old' });
      expect(component.editingNumber()).toBe('7.1');
      component.form.patchValue({ label_ar: 'معدل', summary_en: 'notes' });
      component.submit();

      const payload = versionsService.update.calls.mostRecent().args[3];
      expect([payload.label_en, payload.label_ar]).toEqual(['Old', 'معدل']);
      expect(payload.name).toBeUndefined();
      expect(payload.bump).toBeUndefined();
    });

    it('blocks the upload when the latest number could not be looked up', () => {
      versionsService.latestNumber.and.returnValue(throwError(() => new Error('offline')));
      fixture.detectChanges();

      component.openCreateModal();
      component.form.patchValue({ label_en: '', summary_en: 'next' });
      // A failed lookup must not read as "first version" and invite a starting number.
      component.versionStart.set('7.0');
      pickFile();
      component.submit();

      expect(component.latestNumberError()).toBeTrue();
      expect(component.versionNumberIncomplete()).toBeTrue();
      expect(versionsService.create).not.toHaveBeenCalled();
    });

    it('ignores a slower lookup for a language the user has moved off', () => {
      const arLookup = new Subject<string | null>();
      const frLookup = new Subject<string | null>();
      versionsService.latestNumber.and.callFake((_kind, _slug, language) =>
        language === 'ar' ? arLookup : frLookup
      );
      fixture.detectChanges();

      component.openCreateModal();
      component.onVersionLanguageChange('fr');
      arLookup.next('9.0');
      arLookup.complete();

      expect(component.latestNumberLoading()).toBeTrue();
      expect(component.latestNumber()).toBeNull();

      frLookup.next('2.3');
      frLookup.complete();

      expect(component.latestNumberLoading()).toBeFalse();
      expect(component.latestNumber()).toBe('2.3');
    });

    it('restores with the chosen bump', () => {
      contentService.restoreVersion.and.returnValue(of({} as ContentDraftVersion));
      fixture.detectChanges();
      // Choosing the bump happens inside the confirm dialog, before OK.
      modal.confirm.and.callFake(((options?: ModalOptions) => {
        component.restoreBump.set('major');
        const onOk = options?.nzOnOk as (() => Promise<void>) | undefined;
        onOk?.().catch(() => undefined);
        return {};
      }) as unknown as NzModalService['confirm']);

      component.restoreVersion(page('ar').results[0]);

      expect(versionsService.latestNumber).toHaveBeenCalledWith('translation', 'sahih-intl', 'ar');
      expect(contentService.restoreVersion).toHaveBeenCalledWith(
        'translation',
        'sahih-intl',
        1,
        'major'
      );
    });

    it('switches the restore to major instead of failing when columns were reordered', async () => {
      contentService.restoreVersion.and.returnValue(
        throwError(
          () => new HttpErrorResponse({ status: 400, error: { error_name: 'major_bump_required' } })
        )
      );
      fixture.detectChanges();
      let ok: Promise<void> | undefined;
      modal.confirm.and.callFake(((options?: ModalOptions) => {
        ok = (options?.nzOnOk as () => Promise<void>)();
        return {};
      }) as unknown as NzModalService['confirm']);

      component.restoreVersion(page('ar').results[0]);
      await ok?.catch(() => undefined);

      expect(component.restoreBump()).toBe('major');
      expect(component.restoreRequiresMajor()).toBeTrue();
    });
  });

  describe('mushaf and font numbering', () => {
    function asKind(kind: 'mushaf' | 'font'): void {
      component.kind = kind;
      component.slug = 'uthmanic-hafs';
      component.i18nPrefix = `ADMIN.${kind.toUpperCase()}S.DETAIL.VERSIONS`;
      fixture.detectChanges();
    }

    function pickFile(): void {
      component.onPickFile({
        target: { files: [new File(['x'], 'font.zip')], value: '' },
      } as unknown as Event);
    }

    it('numbers mushaf and font versions without a language picker', () => {
      asKind('font');

      expect(component.numbered()).toBeTrue();
      expect(component.supportsLanguages()).toBeFalse();
      expect(contentService.listLanguages).not.toHaveBeenCalled();
    });

    it('asks for a starting number for the first upload and sends no name or language', () => {
      versionsService.latestNumber.and.returnValue(of(null));
      versionsService.create.and.returnValue(of(page('ar').results[0]));
      asKind('mushaf');

      component.openCreateModal();
      component.form.patchValue({ label_ar: 'الطبعة الأولى', summary_ar: 'أول إصدار' });
      pickFile();
      component.submit();

      expect(versionsService.latestNumber).toHaveBeenCalledWith('mushaf', 'uthmanic-hafs', null);
      expect(component.versionNumberIncomplete()).toBeTrue();
      expect(versionsService.create).not.toHaveBeenCalled();

      component.versionStart.set('1.0');
      component.submit();

      const payload = versionsService.create.calls.mostRecent().args[2];
      expect(payload).toEqual(
        jasmine.objectContaining({
          label_ar: 'الطبعة الأولى',
          summary_ar: 'أول إصدار',
          version_number: '1.0',
          bump: 'minor',
        })
      );
      expect(payload.name).toBeUndefined();
      expect(payload.language).toBeUndefined();
      expect(payload.pre_approved).toBeUndefined();
    });

    it('sends the chosen bump once the font has versions', () => {
      versionsService.latestNumber.and.returnValue(of('1.0'));
      versionsService.create.and.returnValue(of(page('ar').results[0]));
      asKind('font');

      component.openCreateModal();
      component.form.patchValue({ summary_en: 'hinting fixes' });
      component.versionBump.set('major');
      pickFile();
      component.submit();

      const payload = versionsService.create.calls.mostRecent().args[2];
      expect(payload.bump).toBe('major');
      expect(payload.version_number).toBeUndefined();
      expect(payload.name).toBeUndefined();
    });
  });

  describe('failed confirm actions', () => {
    // ng-zorro awaits nzOnOk; a rejection escapes as an unhandled error (Sentry
    // "Handled unknown error"), so a failure resolves false to keep the dialog open.
    let onOk: (() => Promise<unknown>) | undefined;

    beforeEach(() => {
      modal.confirm.and.callFake(((options?: ModalOptions) => {
        onOk = options?.nzOnOk as () => Promise<unknown>;
        return {};
      }) as unknown as NzModalService['confirm']);
      fixture.detectChanges();
    });

    it('keeps the delete dialog open without rejecting when the delete fails', async () => {
      versionsService.delete.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 400 }))
      );

      component.deleteRow({ id: 143, name: '1.0' } as AssetVersion);

      await expectAsync(onOk!()).toBeResolvedTo(false);
      expect(message.error).toHaveBeenCalled();
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
      component.form.patchValue({ label_en: 'v2', summary_en: 'upload' });
      component.onPickFile({
        target: { files: [new File(['x'], 'v2.pdf')], value: '' },
      } as unknown as Event);
      component.submit();

      expect(message.error).toHaveBeenCalledWith('ADMIN.VERSION_PUBLISHING.FILE_UNPARSEABLE_ERROR');
    });
  });

  describe('package availability (itqan CLI)', () => {
    function version(overrides: Partial<AssetVersion> = {}): AssetVersion {
      return { ...page('ar').results[0], package_status: 'released', ...overrides };
    }

    function withPermissions(...perms: string[]): void {
      granted = new Set(perms);
      fixture.detectChanges();
    }

    /** Confirm the dialog after typing `reason` into it, as a user would. */
    function confirmTyping(reason: string): void {
      modal.confirm.and.callFake(((options?: ModalOptions) => {
        component.packageReason.set(reason);
        const onOk = options?.nzOnOk as (() => Promise<void>) | undefined;
        onOk?.().catch(() => undefined);
        return {};
      }) as unknown as NzModalService['confirm']);
    }

    it("explains a withdrawn version with the publisher's rollback reason", () => {
      fixture.detectChanges();

      const hint = component.packageHint(
        version({ package_status: 'withdrawn', withdrawal_reason: 'Errors in Surah 2' })
      );

      expect(hint).toContain('ADMIN.PACKAGE_AVAILABILITY.HINT.WITHDRAWN');
      expect(hint).toContain('Errors in Surah 2');
    });

    it('asks for a reason when publishing goes back, and sends it', () => {
      contentService.setPublishedVersion.and.returnValue(of({} as ContentDraftVersion));
      withPermissions(PORTAL_PERMISSIONS.PORTAL_PUBLISH_CONTENT);
      confirmTyping('  Errors in Surah 2 ');

      component.publishVersion(version({ is_approved: true, publishing_rolls_back: true }));

      expect(contentService.setPublishedVersion).toHaveBeenCalledWith(
        'translation',
        'sahih-intl',
        1,
        'Errors in Surah 2'
      );
    });

    it('refuses to go back to an earlier version without a reason', () => {
      withPermissions(PORTAL_PERMISSIONS.PORTAL_PUBLISH_CONTENT);
      confirmTyping('   ');

      component.publishVersion(version({ is_approved: true, publishing_rolls_back: true }));

      expect(contentService.setPublishedVersion).not.toHaveBeenCalled();
      expect(message.warning).toHaveBeenCalledWith(
        'ADMIN.VERSION_PUBLISHING.ROLLBACK_REASON_REQUIRED'
      );
    });

    it('does not ask for a reason when publishing a newer version', () => {
      contentService.setPublishedVersion.and.returnValue(of({} as ContentDraftVersion));
      withPermissions(PORTAL_PERMISSIONS.PORTAL_PUBLISH_CONTENT);
      confirmTyping('');

      component.publishVersion(version({ is_approved: true, publishing_rolls_back: false }));

      expect(contentService.setPublishedVersion).toHaveBeenCalledWith(
        'translation',
        'sahih-intl',
        1,
        ''
      );
    });

    it('offers removal only to holders of the remove permission', () => {
      withPermissions(PORTAL_PERMISSIONS.PORTAL_PUBLISH_CONTENT);
      expect(component.canRemove(version())).toBeFalse();

      granted = new Set([PORTAL_PERMISSIONS.PORTAL_REMOVE_PACKAGE_VERSION]);
      expect(component.canRemove(version())).toBeTrue();
      expect(component.canRemove(version({ is_published: true }))).toBeFalse();
      expect(component.canRemove(version({ package_status: 'removed' }))).toBeFalse();
    });

    it('refuses to remove a version without a reason', () => {
      withPermissions(PORTAL_PERMISSIONS.PORTAL_REMOVE_PACKAGE_VERSION);
      confirmTyping('   ');

      component.removeVersion(version());

      expect(versionsService.removePackageVersion).not.toHaveBeenCalled();
      expect(message.warning).toHaveBeenCalledWith(
        'ADMIN.PACKAGE_AVAILABILITY.REMOVE_REASON_REQUIRED'
      );
    });

    it('removes a version with the reason given, then reloads the list', () => {
      versionsService.removePackageVersion.and.returnValue(of({}));
      withPermissions(PORTAL_PERMISSIONS.PORTAL_REMOVE_PACKAGE_VERSION);
      versionsService.list.calls.reset();
      confirmTyping('Licence revoked');

      component.removeVersion(version());

      expect(versionsService.removePackageVersion).toHaveBeenCalledWith(1, 'Licence revoked');
      expect(versionsService.list).toHaveBeenCalled();
    });

    it('explains why the version consumers are served cannot be removed', () => {
      versionsService.removePackageVersion.and.returnValue(
        throwError(
          () => new HttpErrorResponse({ status: 400, error: { error_name: 'version_is_served' } })
        )
      );
      withPermissions(PORTAL_PERMISSIONS.PORTAL_REMOVE_PACKAGE_VERSION);
      confirmTyping('Licence revoked');

      component.removeVersion(version());

      expect(message.error).toHaveBeenCalledWith(
        'ADMIN.PACKAGE_AVAILABILITY.VERSION_IS_SERVED_ERROR'
      );
    });

    it('offers undoing a removal only on removed versions, to holders of the remove permission', () => {
      withPermissions(PORTAL_PERMISSIONS.PORTAL_PUBLISH_CONTENT);
      expect(component.canReinstate(version({ package_status: 'removed' }))).toBeFalse();

      granted = new Set([PORTAL_PERMISSIONS.PORTAL_REMOVE_PACKAGE_VERSION]);
      expect(component.canReinstate(version({ package_status: 'removed' }))).toBeTrue();
      expect(component.canReinstate(version({ package_status: 'released' }))).toBeFalse();
    });

    it('refuses to undo a removal without a reason', () => {
      withPermissions(PORTAL_PERMISSIONS.PORTAL_REMOVE_PACKAGE_VERSION);
      confirmTyping('   ');

      component.reinstateVersion(version({ package_status: 'removed' }));

      expect(versionsService.reinstatePackageVersion).not.toHaveBeenCalled();
      expect(message.warning).toHaveBeenCalledWith(
        'ADMIN.PACKAGE_AVAILABILITY.REINSTATE_REASON_REQUIRED'
      );
    });

    it('undoes a removal with the reason given, then reloads the list', () => {
      versionsService.reinstatePackageVersion.and.returnValue(of({}));
      withPermissions(PORTAL_PERMISSIONS.PORTAL_REMOVE_PACKAGE_VERSION);
      versionsService.list.calls.reset();
      confirmTyping(' Licence confirmed ');

      component.reinstateVersion(version({ package_status: 'removed' }));

      expect(versionsService.reinstatePackageVersion).toHaveBeenCalledWith(1, 'Licence confirmed');
      expect(versionsService.list).toHaveBeenCalled();
    });

    it('explains when the version was already brought back', () => {
      versionsService.reinstatePackageVersion.and.returnValue(
        throwError(
          () => new HttpErrorResponse({ status: 400, error: { error_name: 'version_not_removed' } })
        )
      );
      withPermissions(PORTAL_PERMISSIONS.PORTAL_REMOVE_PACKAGE_VERSION);
      confirmTyping('Licence confirmed');

      component.reinstateVersion(version({ package_status: 'removed' }));

      expect(message.error).toHaveBeenCalledWith(
        'ADMIN.PACKAGE_AVAILABILITY.VERSION_NOT_REMOVED_ERROR'
      );
    });
  });

  describe('publish now on upload (mushafs, fonts)', () => {
    function upload(): void {
      component.openCreateModal();
      component.form.patchValue({ label_en: 'v2', summary_en: 'second' });
      component.onPickFile({
        target: { files: [new File(['x'], 'v2.pdf')], value: '' },
      } as unknown as Event);
      component.submit();
    }

    beforeEach(() => {
      component.kind = 'mushaf';
      versionsService.create.and.returnValue(of(page('ar').results[0]));
    });

    it('publishes the upload by default for users who can publish', () => {
      granted = new Set([
        PORTAL_PERMISSIONS.PORTAL_UPDATE_MUSHAF,
        PORTAL_PERMISSIONS.PORTAL_PUBLISH_CONTENT,
      ]);
      fixture.detectChanges();

      upload();

      expect(versionsService.create.calls.mostRecent().args[2].publish).toBeTrue();
    });

    it('stages the upload when the publisher unticks publish now', () => {
      granted = new Set([
        PORTAL_PERMISSIONS.PORTAL_UPDATE_MUSHAF,
        PORTAL_PERMISSIONS.PORTAL_PUBLISH_CONTENT,
      ]);
      fixture.detectChanges();

      component.openCreateModal();
      component.publishNow.set(false);
      component.form.patchValue({ label_en: 'v2', summary_en: 'second' });
      component.onPickFile({
        target: { files: [new File(['x'], 'v2.pdf')], value: '' },
      } as unknown as Event);
      component.submit();

      expect(versionsService.create.calls.mostRecent().args[2].publish).toBeFalse();
    });

    it('stages the upload for users without the publish permission', () => {
      granted = new Set([PORTAL_PERMISSIONS.PORTAL_UPDATE_MUSHAF]);
      fixture.detectChanges();

      upload();

      expect(versionsService.create.calls.mostRecent().args[2].publish).toBeFalse();
    });
  });
});
