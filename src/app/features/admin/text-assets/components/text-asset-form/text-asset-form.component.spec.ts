import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { Licenses } from '../../../../../core/enums/licenses.enum';
import type { MushafLayout } from '../../../models/asset-content.models';
import { PORTAL_PERMISSIONS } from '../../../constants/portal-permission.constants';
import { AdminAuthService } from '../../../services/admin-auth.service';
import { AdminTenantService } from '../../../services/admin-tenant.service';
import { MushafLayoutsService } from '../../../services/mushaf-layouts.service';
import type { TextAssetDetails } from '../../models/text-assets.models';
import { AssetTagsService } from '../../services/asset-tags.service';
import { TextAssetsService } from '../../services/text-assets.service';
import { TextAssetFormComponent } from './text-asset-form.component';

describe('TextAssetFormComponent template controls', () => {
  let textAssetsServiceMock: jasmine.SpyObj<TextAssetsService>;
  let layoutsServiceMock: jasmine.SpyObj<MushafLayoutsService>;
  /** The selected publisher's permissions (a signal, as the real service's are). */
  const grantedPermissions = signal<string[]>([]);

  const layouts: MushafLayout[] = [
    { id: 1, name: 'Standard 15-line', page_count: 604, assets_count: 3 },
  ];

  const detail: TextAssetDetails = {
    id: 1,
    slug: 'existing-tafsir',
    name_ar: 'اسم التفسير',
    name_en: 'Tafsir name',
    description_ar: 'وصف قصير',
    description_en: 'Short description',
    long_description_ar: 'وصف طويل',
    long_description_en: 'Long description',
    thumbnail_url: null,
    publisher: { id: 1, name: 'Publisher' },
    license: Licenses.CC0,
    language: 'ar',
    is_external: false,
    is_open_access: false,
    in_gallery: true,
    in_public_api: true,
    in_cli: true,
    in_tenants: true,
    external_url: null,
    template: 'page',
    tags: [{ slug: 'tafsir', name: 'Tafsir' }],
    mushaf_layout: { id: 1, name: 'Standard 15-line', page_count: 604 },
    versions: [],
    created_at: '2026-01-01T00:00:00Z',
  };

  const COLUMN_PERMISSIONS = [
    PORTAL_PERMISSIONS.PORTAL_MANAGE_ASSET_COLUMNS,
    PORTAL_PERMISSIONS.PORTAL_ACCESS_ALL_LANGUAGES,
  ];

  function configure(routeParams: Record<string, string>, permissions: string[] = []): void {
    grantedPermissions.set(permissions);
    textAssetsServiceMock = jasmine.createSpyObj<TextAssetsService>('TextAssetsService', [
      'getDetail',
      'create',
      'patch',
    ]);
    textAssetsServiceMock.getDetail.and.returnValue(of(detail));

    layoutsServiceMock = jasmine.createSpyObj<MushafLayoutsService>('MushafLayoutsService', [
      'list',
    ]);
    layoutsServiceMock.list.and.returnValue(of(layouts));

    TestBed.configureTestingModule({
      imports: [TextAssetFormComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { params: routeParams } } },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
        { provide: TextAssetsService, useValue: textAssetsServiceMock },
        {
          provide: AssetTagsService,
          useValue: {
            list: () =>
              of([
                { slug: 'tafsir', name: 'Tafsir' },
                { slug: 'translation', name: 'Translation' },
              ]),
          },
        },
        {
          provide: AdminTenantService,
          useValue: { publishers: signal([]), selectedPublisherId: signal(null) },
        },
        { provide: MushafLayoutsService, useValue: layoutsServiceMock },
        {
          provide: AdminAuthService,
          useValue: { hasPermission: (code: string) => grantedPermissions().includes(code) },
        },
        {
          provide: NzMessageService,
          useValue: jasmine.createSpyObj<NzMessageService>('NzMessageService', [
            'success',
            'error',
          ]),
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

    TestBed.overrideProvider(NzModalService, {
      useValue: jasmine.createSpyObj<NzModalService>('NzModalService', ['confirm']),
    });
    TestBed.overrideComponent(TextAssetFormComponent, { set: { template: '' } });
  }

  it("shows the backend's message and retries when the tags fail to load", () => {
    configure({});
    const list = jasmine.createSpy('list').and.returnValues(
      throwError(() => new HttpErrorResponse({ status: 503, error: { message: 'Tags are down' } })),
      of([{ slug: 'tafsir', name: 'Tafsir' }])
    );
    TestBed.overrideProvider(AssetTagsService, { useValue: { list } });
    const fixture = TestBed.createComponent(TextAssetFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;

    expect(component.tagsError()).toBe('Tags are down');

    component.loadTags();

    expect(component.tagsError()).toBeNull();
    expect(component.tagOptions()).toEqual([{ slug: 'tafsir', name: 'Tafsir' }]);
  });

  it('requires a template when creating', () => {
    configure({});
    const fixture = TestBed.createComponent(TextAssetFormComponent);
    fixture.detectChanges();
    const form = fixture.componentInstance.form;

    form.get('template')!.setValue(null);

    expect(form.get('template')!.valid).toBe(false);
  });

  it('requires a layout only when the template is page based', () => {
    configure({});
    const fixture = TestBed.createComponent(TextAssetFormComponent);
    fixture.detectChanges();
    const form = fixture.componentInstance.form;

    form.get('template')!.setValue('ayah');
    const layoutOptionalWhenAyah = form.get('mushaf_layout_id')!.valid;
    form.get('template')!.setValue('page');
    form.get('mushaf_layout_id')!.setValue(null);

    expect(layoutOptionalWhenAyah).toBe(true);
    expect(form.get('mushaf_layout_id')!.valid).toBe(false);
  });

  it('clears the layout when the template moves off page', () => {
    configure({});
    const fixture = TestBed.createComponent(TextAssetFormComponent);
    fixture.detectChanges();
    const form = fixture.componentInstance.form;

    form.get('template')!.setValue('page');
    form.get('mushaf_layout_id')!.setValue(1);
    form.get('template')!.setValue('ayah');

    expect(form.get('mushaf_layout_id')!.value).toBeNull();
  });

  it('disables both controls in edit mode', () => {
    configure({ slug: 'existing-tafsir' });
    const fixture = TestBed.createComponent(TextAssetFormComponent);

    fixture.detectChanges();

    expect(fixture.componentInstance.form.get('template')!.disabled).toBe(true);
    expect(fixture.componentInstance.form.get('mushaf_layout_id')!.disabled).toBe(true);
  });

  it('omits template and mushaf_layout_id from the update payload', () => {
    configure({ slug: 'existing-tafsir' });
    textAssetsServiceMock.patch.and.returnValue(of(detail));
    const fixture = TestBed.createComponent(TextAssetFormComponent);
    fixture.detectChanges();

    fixture.componentInstance.onSubmit();

    expect(textAssetsServiceMock.patch).toHaveBeenCalled();
    const body = textAssetsServiceMock.patch.calls.mostRecent().args[1];
    expect(Object.prototype.hasOwnProperty.call(body, 'template')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(body, 'mushaf_layout_id')).toBe(false);
  });

  it('requires the package name to start with the first tag', () => {
    configure({});
    const fixture = TestBed.createComponent(TextAssetFormComponent);
    fixture.detectChanges();
    const { tags, slug } = fixture.componentInstance.form.controls;

    tags.setValue(['translation', 'tafsir']);
    slug.setValue('tafsir-ibn-kathir');
    expect(slug.hasError('assetSlugPrefix')).toBeTrue();

    slug.setValue('translation-en-sahih');
    expect(slug.valid).toBeTrue();
  });

  it('offers the ayah-group and word-group templates only with the tafsir tag', () => {
    configure({});
    const fixture = TestBed.createComponent(TextAssetFormComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.controls.tags.setValue(['translation']);
    expect(fixture.componentInstance.templateOptions()).toEqual(['surah', 'ayah', 'word', 'page']);

    fixture.componentInstance.form.controls.tags.setValue(['tafsir']);
    expect(fixture.componentInstance.templateOptions()).toEqual([
      'surah',
      'ayah',
      'word',
      'page',
      'ayah_group',
      'word_group',
    ]);
  });

  it('creates a word-group tafsir without a mushaf layout', () => {
    configure({});
    textAssetsServiceMock.create.and.returnValue(of(detail));
    const fixture = TestBed.createComponent(TextAssetFormComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.patchValue({
      name_ar: 'اسم التفسير',
      description_ar: 'وصف',
      description_en: 'Description',
      license: Licenses.CC0,
      language: 'ar',
      publisher_id: 1,
      slug: 'tafsir-sample',
      tags: ['tafsir'],
      template: 'word_group',
    });

    expect(fixture.componentInstance.form.controls.mushaf_layout_id.valid).toBeTrue();
    fixture.componentInstance.onSubmit();

    expect(textAssetsServiceMock.create).toHaveBeenCalled();
    const body = textAssetsServiceMock.create.calls.mostRecent().args[0];
    expect(body.template).toBe('word_group');
    expect(body.tags).toEqual(['tafsir']);
    expect(body.mushaf_layout_id).toBeNull();
  });

  it('includes template and mushaf_layout_id in the create payload', () => {
    configure({});
    textAssetsServiceMock.create.and.returnValue(of(detail));
    const fixture = TestBed.createComponent(TextAssetFormComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.patchValue({
      name_ar: 'اسم التفسير',
      description_ar: 'وصف',
      description_en: 'Description',
      long_description_ar: 'وصف طويل',
      long_description_en: 'Long description',
      license: Licenses.CC0,
      language: 'ar',
      publisher_id: 1,
      slug: 'tafsir-sample',
      tags: ['tafsir'],
      template: 'page',
      mushaf_layout_id: 1,
    });

    fixture.componentInstance.onSubmit();

    expect(textAssetsServiceMock.create).toHaveBeenCalled();
    const body = textAssetsServiceMock.create.calls.mostRecent().args[0];
    expect(body.template).toBe('page');
    expect(body.mushaf_layout_id).toBe(1);
  });

  it('creates without long descriptions, which are optional', () => {
    configure({});
    textAssetsServiceMock.create.and.returnValue(of(detail));
    const fixture = TestBed.createComponent(TextAssetFormComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.patchValue({
      name_ar: 'اسم',
      description_ar: 'وصف',
      description_en: 'Description',
      license: Licenses.CC0,
      language: 'ar',
      publisher_id: 1,
      slug: 'tafsir-sample',
      tags: ['tafsir'],
      template: 'ayah',
    });

    fixture.componentInstance.onSubmit();

    expect(fixture.componentInstance.form.controls.long_description_ar.valid).toBeTrue();
    expect(fixture.componentInstance.form.controls.long_description_en.valid).toBeTrue();
    expect(textAssetsServiceMock.create).toHaveBeenCalled();
  });

  describe('columns', () => {
    function fillRequired(component: TextAssetFormComponent): void {
      component.form.patchValue({
        name_ar: 'اسم',
        description_ar: 'وصف',
        description_en: 'Description',
        license: Licenses.CC0,
        language: 'ar',
        publisher_id: 1,
        slug: 'tafsir-sample',
        tags: ['tafsir'],
        template: 'ayah',
      });
    }

    it('sends the columns in order, with trimmed labels, when the user may manage them', () => {
      // Arrange
      configure({}, COLUMN_PERMISSIONS);
      textAssetsServiceMock.create.and.returnValue(of(detail));
      const fixture = TestBed.createComponent(TextAssetFormComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      fillRequired(component);
      component.columns.at(0).patchValue({ key: 'question', label_en: ' Question ' });
      component.addColumn();
      component.columns.at(1).patchValue({ key: 'answer', label_ar: 'الجواب' });
      component.addColumn();
      component.columns.at(2).patchValue({ key: 'note' });

      // Act
      component.moveColumn(2, -1);
      component.removeColumn(2);
      component.onSubmit();

      // Assert
      const body = textAssetsServiceMock.create.calls.mostRecent().args[0];
      expect(body.columns).toEqual([
        { key: 'question', label_en: 'Question', label_ar: '' },
        { key: 'note', label_en: '', label_ar: '' },
      ]);
      expect(component.templateColumnKeys()).toEqual(['question', 'note']);
    });

    it('neither shows nor sends columns without the permissions', () => {
      // Arrange
      configure({}, [PORTAL_PERMISSIONS.PORTAL_MANAGE_ASSET_COLUMNS]);
      textAssetsServiceMock.create.and.returnValue(of(detail));
      const fixture = TestBed.createComponent(TextAssetFormComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      fillRequired(component);

      // Act
      component.onSubmit();

      // Assert
      expect(component.canManageColumns()).toBeFalse();
      expect(component.templateColumnKeys()).toBeNull();
      expect(textAssetsServiceMock.create.calls.mostRecent().args[0].columns).toBeUndefined();
    });

    it('blocks saving on a repeated or invalid key and offers no template meanwhile', () => {
      // Arrange
      configure({}, COLUMN_PERMISSIONS);
      const fixture = TestBed.createComponent(TextAssetFormComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      fillRequired(component);

      // Act
      component.addColumn();
      component.columns.at(1).patchValue({ key: 'text' });

      // Assert
      expect(component.columnKeyError()).toBe('ADMIN.TEXT_ASSETS.FORM.COLUMN_KEY_DUPLICATE');
      expect(component.templateColumnKeys()).toEqual([]);

      // Act
      component.columns.at(1).patchValue({ key: 'Bad Key' });
      component.onSubmit();

      // Assert
      expect(component.columnKeyError()).toBe(
        'ADMIN.CONTENT_EDITOR.COLUMNS_MANAGE.ERRORS.COLUMN_KEY_INVALID'
      );
      expect(textAssetsServiceMock.create).not.toHaveBeenCalled();
    });

    it('stops sending columns when another publisher without the permissions is selected', () => {
      // Arrange
      configure({}, COLUMN_PERMISSIONS);
      const fixture = TestBed.createComponent(TextAssetFormComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      expect(component.columns.enabled).toBeTrue();

      // Act
      grantedPermissions.set([]);
      fixture.detectChanges();

      // Assert
      expect(component.columns.disabled).toBeTrue();
    });

    it('accepts a padded key and sends it trimmed, but not a blank one', () => {
      // Arrange
      configure({}, COLUMN_PERMISSIONS);
      textAssetsServiceMock.create.and.returnValue(of(detail));
      const fixture = TestBed.createComponent(TextAssetFormComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;
      fillRequired(component);
      component.addColumn();
      component.columns.at(1).patchValue({ key: '   ' });

      // Assert
      expect(component.columns.at(1).valid).toBeFalse();

      // Act
      component.columns.at(1).patchValue({ key: ' answer ' });
      component.onSubmit();

      // Assert
      expect(component.templateColumnKeys()).toEqual(['text', 'answer']);
      expect(textAssetsServiceMock.create.calls.mostRecent().args[0].columns?.[1].key).toBe(
        'answer'
      );
    });

    it('does not call two blank new keys repeated', () => {
      // Arrange
      configure({}, COLUMN_PERMISSIONS);
      const fixture = TestBed.createComponent(TextAssetFormComponent);
      fixture.detectChanges();
      const component = fixture.componentInstance;

      // Act
      component.addColumn();
      component.addColumn();

      // Assert
      expect(component.columnKeyError()).toBeNull();
      expect(component.columns.invalid).toBeTrue();
    });

    it('keeps the last column', () => {
      // Arrange
      configure({}, COLUMN_PERMISSIONS);
      const fixture = TestBed.createComponent(TextAssetFormComponent);
      fixture.detectChanges();

      // Act
      fixture.componentInstance.removeColumn(0);

      // Assert
      expect(fixture.componentInstance.columns.length).toBe(1);
    });

    it('leaves columns out of an update', () => {
      // Arrange
      configure({ slug: 'existing-tafsir' }, COLUMN_PERMISSIONS);
      textAssetsServiceMock.patch.and.returnValue(of(detail));
      const fixture = TestBed.createComponent(TextAssetFormComponent);
      fixture.detectChanges();

      // Act
      fixture.componentInstance.onSubmit();

      // Assert
      expect(fixture.componentInstance.columns.disabled).toBeTrue();
      expect(textAssetsServiceMock.patch.calls.mostRecent().args[1].columns).toBeUndefined();
    });
  });
});
