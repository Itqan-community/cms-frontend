import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { of } from 'rxjs';

import { Licenses } from '../../../../../core/enums/licenses.enum';
import { AdminTenantService } from '../../../services/admin-tenant.service';
import type { MushafDetails } from '../../models/mushafs.models';
import { MushafsService } from '../../services/mushafs.service';
import { MushafFormComponent } from './mushaf-form.component';

describe('MushafFormComponent first version', () => {
  let mushafsServiceMock: jasmine.SpyObj<MushafsService>;

  function create(): MushafFormComponent {
    mushafsServiceMock = jasmine.createSpyObj<MushafsService>('MushafsService', [
      'getDetail',
      'create',
      'patch',
    ]);
    mushafsServiceMock.create.and.returnValue(of({ slug: 'new-mushaf' } as MushafDetails));

    TestBed.configureTestingModule({
      imports: [MushafFormComponent],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
        { provide: Router, useValue: jasmine.createSpyObj<Router>('Router', ['navigate']) },
        { provide: MushafsService, useValue: mushafsServiceMock },
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
    TestBed.overrideComponent(MushafFormComponent, { set: { template: '' } });

    const fixture = TestBed.createComponent(MushafFormComponent);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    component.form.patchValue({
      name_ar: 'مصحف المدينة',
      description_ar: 'وصف',
      description_en: 'Description',
      license: Licenses.CC0,
      language: 'ar',
      publisher_id: 1,
    });
    component.versionFile.set(new File(['x'], 'mushaf.zip'));
    // Applies the validators that depend on the attached file.
    fixture.detectChanges();
    return component;
  }

  it('needs a starting version number once a file is attached', () => {
    const component = create();

    component.onSubmit();

    expect(component.form.controls.version_number.valid).toBeFalse();
    expect(mushafsServiceMock.create).not.toHaveBeenCalled();
  });

  it('rejects a version number that is not major.minor', () => {
    const component = create();

    component.form.patchValue({ version_number: 'v1' });
    component.onSubmit();

    expect(component.form.controls.version_number.valid).toBeFalse();
    expect(mushafsServiceMock.create).not.toHaveBeenCalled();
  });

  it('sends the number with the bilingual name and summary', () => {
    const component = create();

    component.form.patchValue({
      version_number: '1.0',
      version_name_ar: 'الطبعة الأولى',
      version_summary_en: 'First printing',
    });
    component.onSubmit();

    const body = mushafsServiceMock.create.calls.mostRecent().args[0];
    expect(body.version_number).toBe('1.0');
    expect(body.version_name_ar).toBe('الطبعة الأولى');
    expect(body.version_summary_en).toBe('First printing');
    expect(body.file?.name).toBe('mushaf.zip');
  });
});
