import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { of, throwError } from 'rxjs';

import { Licenses } from '../../../../../core/enums/licenses.enum';
import { AdminTenantService } from '../../../services/admin-tenant.service';
import type { MushafDetails } from '../../models/mushafs.models';
import { MushafsService } from '../../services/mushafs.service';
import { MushafFormComponent } from './mushaf-form.component';

describe('MushafFormComponent first version', () => {
  let mushafsServiceMock: jasmine.SpyObj<MushafsService>;
  let modalMock: jasmine.SpyObj<NzModalService>;

  function create(): MushafFormComponent {
    mushafsServiceMock = jasmine.createSpyObj<MushafsService>('MushafsService', [
      'getDetail',
      'create',
      'patch',
    ]);
    mushafsServiceMock.create.and.returnValue(of({ slug: 'new-mushaf' } as MushafDetails));
    modalMock = jasmine.createSpyObj<NzModalService>('NzModalService', ['confirm']);

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
    TestBed.overrideProvider(NzModalService, { useValue: modalMock });
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
      slug: 'mushaf-madinah',
    });
    component.onSubmit();

    const body = mushafsServiceMock.create.calls.mostRecent().args[0];
    expect(body.version_number).toBe('1.0');
    expect(body.version_name_ar).toBe('الطبعة الأولى');
    expect(body.version_summary_en).toBe('First printing');
    expect(body.file?.name).toBe('mushaf.zip');
  });

  it('blocks create until a package slug is filled', () => {
    const component = create();

    component.form.patchValue({ version_number: '1.0', slug: '' });
    component.onSubmit();

    expect(mushafsServiceMock.create).not.toHaveBeenCalled();
  });

  it('rejects a typed slug that is not lowercase-hyphenated', () => {
    const component = create();

    component.form.patchValue({ version_number: '1.0', slug: 'Mushaf Madinah' });
    component.onSubmit();

    expect(mushafsServiceMock.create).not.toHaveBeenCalled();
  });

  it('creates the asset as a draft when the Draft switch is on', () => {
    const component = create();

    component.form.patchValue({
      version_number: '1.0',
      slug: 'mushaf-madinah-hafs',
      is_draft: true,
    });
    component.onSubmit();

    expect(mushafsServiceMock.create.calls.mostRecent().args[0].status).toBe('draft');
  });

  it('creates the asset ready by default', () => {
    const component = create();

    component.form.patchValue({ version_number: '1.0', slug: 'mushaf-madinah-hafs' });
    component.onSubmit();

    expect(mushafsServiceMock.create.calls.mostRecent().args[0].status).toBe('ready');
  });

  it('sends the suggested slug on create', () => {
    const component = create();

    component.form.patchValue({ version_number: '1.0', slug: 'mushaf-madinah-hafs' });
    component.onSubmit();

    expect(mushafsServiceMock.create.calls.mostRecent().args[0].slug).toBe('mushaf-madinah-hafs');
  });

  it('sends all four channel flags on by default', () => {
    const component = create();

    component.form.patchValue({ version_number: '1.0', slug: 'mushaf-madinah' });
    component.onSubmit();

    const body = mushafsServiceMock.create.calls.mostRecent().args[0];
    expect([body.in_gallery, body.in_public_api, body.in_cli, body.in_tenants]).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect(body.confirm_channel_change).toBeUndefined();
  });

  describe('channel_has_active_consumers', () => {
    const conflict = new HttpErrorResponse({
      status: 409,
      error: {
        error_name: 'channel_has_active_consumers',
        message: 'Developers depend on this channel.',
        extra: { approved_count: 2, pending_count: 1, channels: ['in_cli'] },
      },
    });

    function submitConflicting(): MushafFormComponent {
      const component = create();
      mushafsServiceMock.create.and.returnValues(
        throwError(() => conflict),
        of({ slug: 'm' } as MushafDetails)
      );
      component.form.patchValue({
        version_number: '1.0',
        slug: 'mushaf-madinah',
        in_cli: false,
      });
      component.onSubmit();
      return component;
    }

    it('asks for confirmation and re-sends with confirm_channel_change on OK', () => {
      submitConflicting();

      expect(modalMock.confirm).toHaveBeenCalledTimes(1);
      expect(mushafsServiceMock.create).toHaveBeenCalledTimes(1);

      (modalMock.confirm.calls.mostRecent().args[0]!.nzOnOk as () => void)();

      expect(mushafsServiceMock.create).toHaveBeenCalledTimes(2);
      const resent = mushafsServiceMock.create.calls.mostRecent().args[0];
      expect(resent.confirm_channel_change).toBeTrue();
      expect(resent.in_cli).toBeFalse();
    });

    it('does not re-send when the admin cancels', () => {
      const component = submitConflicting();

      expect(mushafsServiceMock.create).toHaveBeenCalledTimes(1);
      expect(component.submitting()).toBeFalse();
      expect(component.form.controls.in_cli.value).toBeFalse();
    });
  });
});
