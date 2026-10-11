import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { of } from 'rxjs';

import { Licenses } from '../../../../../core/enums/licenses.enum';
import { AdminTenantService } from '../../../services/admin-tenant.service';
import type { FontDetails } from '../../models/fonts.models';
import { FontsService } from '../../services/fonts.service';
import { FontFormComponent } from './font-form.component';

describe('FontFormComponent first version', () => {
  let fontsServiceMock: jasmine.SpyObj<FontsService>;

  function create(): FontFormComponent {
    fontsServiceMock = jasmine.createSpyObj<FontsService>('FontsService', [
      'getDetail',
      'create',
      'patch',
    ]);
    fontsServiceMock.create.and.returnValue(of({ slug: 'new-font' } as FontDetails));

    TestBed.configureTestingModule({
      imports: [FontFormComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
        { provide: FontsService, useValue: fontsServiceMock },
        {
          provide: AdminTenantService,
          useValue: { publishers: signal([]), selectedPublisherId: signal(null) },
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
    TestBed.overrideComponent(FontFormComponent, { set: { template: '' } });

    const fixture = TestBed.createComponent(FontFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.patchValue({
      name_ar: 'خط عثماني',
      description_ar: 'وصف',
      description_en: 'Description',
      license: Licenses.CC0,
      language: 'ar',
      publisher_id: 1,
    });
    component.versionFile.set(new File(['x'], 'font.zip'));
    // Applies the validators that depend on the attached file.
    fixture.detectChanges();
    return component;
  }

  it('needs a starting version number once a file is attached', () => {
    const component = create();

    component.onSubmit();

    expect(component.form.controls.version_number.valid).toBeFalse();
    expect(fontsServiceMock.create).not.toHaveBeenCalled();
  });

  it('rejects a version number that is not major.minor', () => {
    const component = create();

    component.form.patchValue({ version_number: 'v1' });
    component.onSubmit();

    expect(component.form.controls.version_number.valid).toBeFalse();
    expect(fontsServiceMock.create).not.toHaveBeenCalled();
  });

  it('sends the number with the bilingual name and summary', () => {
    const component = create();

    component.form.patchValue({
      version_number: '1.0',
      version_name_ar: 'الطبعة الأولى',
      version_summary_en: 'First printing',
    });
    component.onSubmit();

    const body = fontsServiceMock.create.calls.mostRecent().args[0];
    expect(body.version_number).toBe('1.0');
    expect(body.version_name_ar).toBe('الطبعة الأولى');
    expect(body.version_summary_en).toBe('First printing');
    expect(body.file?.name).toBe('font.zip');
  });
});
