import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { of } from 'rxjs';

import { Licenses } from '../../../../../core/enums/licenses.enum';
import type { MushafLayout } from '../../../models/asset-content.models';
import { AdminTenantService } from '../../../services/admin-tenant.service';
import { MushafLayoutsService } from '../../../services/mushaf-layouts.service';
import type { TranslationDetails } from '../../models/translations.models';
import { TranslationsService } from '../../services/translations.service';
import { TranslationFormComponent } from './translation-form.component';

describe('TranslationFormComponent template controls', () => {
  let translationsServiceMock: jasmine.SpyObj<TranslationsService>;
  let layoutsServiceMock: jasmine.SpyObj<MushafLayoutsService>;

  const layouts: MushafLayout[] = [
    { id: 1, name: 'Standard 15-line', page_count: 604, assets_count: 3 },
  ];

  const detail: TranslationDetails = {
    id: 1,
    slug: 'existing-translation',
    name_ar: 'اسم الترجمة',
    name_en: 'Translation name',
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
    restricted_for_tenant: false,
    external_url: null,
    template: 'page',
    mushaf_layout: { id: 1, name: 'Standard 15-line', page_count: 604 },
    versions: [],
    created_at: '2026-01-01T00:00:00Z',
  };

  function configure(routeParams: Record<string, string>): void {
    translationsServiceMock = jasmine.createSpyObj<TranslationsService>('TranslationsService', [
      'getDetail',
      'create',
      'patch',
    ]);
    translationsServiceMock.getDetail.and.returnValue(of(detail));

    layoutsServiceMock = jasmine.createSpyObj<MushafLayoutsService>('MushafLayoutsService', [
      'list',
    ]);
    layoutsServiceMock.list.and.returnValue(of(layouts));

    TestBed.configureTestingModule({
      imports: [TranslationFormComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { params: routeParams } } },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
        { provide: TranslationsService, useValue: translationsServiceMock },
        {
          provide: AdminTenantService,
          useValue: { publishers: signal([]), selectedPublisherId: signal(null) },
        },
        { provide: MushafLayoutsService, useValue: layoutsServiceMock },
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

    TestBed.overrideComponent(TranslationFormComponent, { set: { template: '' } });
  }

  it('requires a template when creating', () => {
    configure({});
    const fixture = TestBed.createComponent(TranslationFormComponent);
    fixture.detectChanges();
    const form = fixture.componentInstance.form;

    form.get('template')!.setValue(null);

    expect(form.get('template')!.valid).toBe(false);
  });

  it('requires a layout only when the template is page based', () => {
    configure({});
    const fixture = TestBed.createComponent(TranslationFormComponent);
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
    const fixture = TestBed.createComponent(TranslationFormComponent);
    fixture.detectChanges();
    const form = fixture.componentInstance.form;

    form.get('template')!.setValue('page');
    form.get('mushaf_layout_id')!.setValue(1);
    form.get('template')!.setValue('ayah');

    expect(form.get('mushaf_layout_id')!.value).toBeNull();
  });

  it('disables both controls in edit mode', () => {
    configure({ slug: 'existing-translation' });
    const fixture = TestBed.createComponent(TranslationFormComponent);

    fixture.detectChanges();

    expect(fixture.componentInstance.form.get('template')!.disabled).toBe(true);
    expect(fixture.componentInstance.form.get('mushaf_layout_id')!.disabled).toBe(true);
  });

  it('omits template and mushaf_layout_id from the update payload', () => {
    configure({ slug: 'existing-translation' });
    translationsServiceMock.patch.and.returnValue(of(detail));
    const fixture = TestBed.createComponent(TranslationFormComponent);
    fixture.detectChanges();

    fixture.componentInstance.onSubmit();

    expect(translationsServiceMock.patch).toHaveBeenCalled();
    const body = translationsServiceMock.patch.calls.mostRecent().args[1];
    expect(Object.prototype.hasOwnProperty.call(body, 'template')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(body, 'mushaf_layout_id')).toBe(false);
  });

  it('includes template and mushaf_layout_id in the create payload', () => {
    configure({});
    translationsServiceMock.create.and.returnValue(of(detail));
    const fixture = TestBed.createComponent(TranslationFormComponent);
    fixture.detectChanges();

    fixture.componentInstance.form.patchValue({
      name_ar: 'اسم الترجمة',
      description_ar: 'وصف',
      description_en: 'Description',
      long_description_ar: 'وصف طويل',
      long_description_en: 'Long description',
      license: Licenses.CC0,
      language: 'ar',
      publisher_id: 1,
      template: 'page',
      mushaf_layout_id: 1,
    });

    fixture.componentInstance.onSubmit();

    expect(translationsServiceMock.create).toHaveBeenCalled();
    const body = translationsServiceMock.create.calls.mostRecent().args[0];
    expect(body.template).toBe('page');
    expect(body.mushaf_layout_id).toBe(1);
  });
});
