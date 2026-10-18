import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { of, Subject, throwError } from 'rxjs';
import { AiTranslateResponse, AiTranslateService } from '../../services/ai-translate.service';
import { AiTranslateActionsComponent } from './ai-translate-actions.component';

describe('AiTranslateActionsComponent', () => {
  let fixture: ComponentFixture<AiTranslateActionsComponent>;
  let component: AiTranslateActionsComponent;
  let api: jasmine.SpyObj<AiTranslateService>;
  let message: jasmine.SpyObj<NzMessageService>;
  let form: FormGroup;

  const ok = (res: Partial<AiTranslateResponse>) =>
    of({ fields: {}, sources: [], slug: null, ...res } as AiTranslateResponse);

  beforeEach(() => {
    api = jasmine.createSpyObj<AiTranslateService>('AiTranslateService', ['translate']);
    message = jasmine.createSpyObj<NzMessageService>('NzMessageService', [
      'info',
      'success',
      'error',
      'warning',
    ]);
    TestBed.configureTestingModule({
      imports: [AiTranslateActionsComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AiTranslateService, useValue: api },
        { provide: NzMessageService, useValue: message },
      ],
    });
    form = new FormGroup({
      name_ar: new FormControl('تفسير السعدي'),
      name_en: new FormControl(''),
      description_ar: new FormControl('وصف'),
      description_en: new FormControl('Typed by admin'),
      long_description_ar: new FormControl(''),
      long_description_en: new FormControl(''),
      language: new FormControl('ar'),
      slug: new FormControl(''),
    });
    fixture = TestBed.createComponent(AiTranslateActionsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('form', form);
    fixture.componentRef.setInput('category', 'tafsir');
    fixture.detectChanges();
  });

  it('should send the empty english fields and the slug inputs in one request', () => {
    api.translate.and.returnValue(
      ok({ fields: { name: 'Tafsir Al-Saadi' }, slug: 'tafsir-saadi' })
    );

    component.run('translate');

    expect(api.translate).toHaveBeenCalledOnceWith({
      mode: 'translate',
      category: 'tafsir',
      fields: { name: 'تفسير السعدي' },
      context: {},
      slug_for: { name_ar: 'تفسير السعدي', name_en: '', language: 'ar' },
    });
    expect(form.value.name_en).toBe('Tafsir Al-Saadi');
    expect(form.controls['name_en'].dirty).toBeTrue();
    expect(form.value.slug).toBe('tafsir-saadi');
    expect(component.slugEditable()).toBeFalse();
    expect(message.success).toHaveBeenCalled();
  });

  it('should not overwrite filled english fields', () => {
    api.translate.and.returnValue(
      ok({ fields: { name: 'Tafsir Al-Saadi', description: 'AI text' } })
    );

    component.run('translate');

    expect(form.value.description_en).toBe('Typed by admin');
  });

  it('should not overwrite english typed while the request was running', () => {
    const response = new Subject<AiTranslateResponse>();
    api.translate.and.returnValue(response.asObservable());

    component.run('translate');
    form.patchValue({ name_en: 'Typed meanwhile' });
    response.next({ fields: { name: 'Tafsir Al-Saadi' }, sources: [], slug: 'tafsir-saadi' });
    response.complete();

    expect(form.value.name_en).toBe('Typed meanwhile');
  });

  it('should still ask for the slug when every english field is filled', () => {
    form.patchValue({ name_en: 'Tafsir Al-Saadi' });
    api.translate.and.returnValue(ok({ slug: 'tafsir-saadi' }));

    component.run('translate');

    expect(api.translate.calls.mostRecent().args[0].fields).toEqual({});
    expect(form.value.slug).toBe('tafsir-saadi');
  });

  it('should not call the api when there is nothing to fill and no slug field', () => {
    form.removeControl('slug');
    form.patchValue({ name_en: 'Done' });

    component.run('translate');

    expect(api.translate).not.toHaveBeenCalled();
    expect(message.info).toHaveBeenCalled();
  });

  it('should not call the api when no arabic value or name is entered', () => {
    form.patchValue({ name_ar: '', description_ar: '' });

    component.run('web');

    expect(api.translate).not.toHaveBeenCalled();
    expect(message.info).toHaveBeenCalled();
  });

  it('should ask for the arabic details when arabic and english are all empty', () => {
    const translate = TestBed.inject(TranslateService);
    spyOn(translate, 'instant').and.callFake((key: string | string[]) => String(key));
    form.patchValue({ name_ar: '', description_ar: '', description_en: '' });

    component.run('translate');

    expect(api.translate).not.toHaveBeenCalled();
    expect(message.info).toHaveBeenCalledOnceWith('ADMIN.AI_TRANSLATE.NEED_ARABIC');
  });

  it('should say nothing to fill only when arabic exists and english is complete', () => {
    const translate = TestBed.inject(TranslateService);
    spyOn(translate, 'instant').and.callFake((key: string | string[]) => String(key));
    form.removeControl('slug');
    form.patchValue({ name_en: 'Done' });

    component.run('translate');

    expect(message.info).toHaveBeenCalledOnceWith('ADMIN.AI_TRANSLATE.NOTHING_TO_FILL');
  });

  it('should request empty description fields and the arabic name in web mode', () => {
    form.patchValue({ name_en: 'Already named', description_en: '' });
    api.translate.and.returnValue(
      ok({
        fields: { name: 'Ignored', description: 'From web', long_description: 'Long' },
        sources: ['https://a.example'],
      })
    );

    component.run('web');

    expect(api.translate.calls.mostRecent().args[0].fields).toEqual({
      name: 'تفسير السعدي',
      description: 'وصف',
      long_description: '',
    });
    expect(form.value.name_en).toBe('Already named');
    expect(form.value.description_en).toBe('From web');
    expect(form.value.long_description_en).toBe('Long');
    expect(component.sources()).toEqual(['https://a.example']);
  });

  it('should show decoded, readable source links', () => {
    expect(
      component.displayUrl('https://ar.wikipedia.org/wiki/%D8%AA%D9%81%D8%B3%D9%8A%D8%B1')
    ).toBe('https://ar.wikipedia.org/wiki/تفسير');
    expect(component.displayUrl('https://x.example/%E0%A4%A')).toBe('https://x.example/%E0%A4%A');
  });

  it('should send reciter, riwayah and year for a recitation slug', () => {
    form.addControl('reciter_id', new FormControl(7));
    form.addControl('riwayah_id', new FormControl(3));
    form.addControl('year', new FormControl(1440));
    fixture.componentRef.setInput('category', 'recitation');
    api.translate.and.returnValue(ok({}));

    component.run('translate');

    expect(api.translate.calls.mostRecent().args[0].slug_for).toEqual(
      jasmine.objectContaining({ reciter_id: 7, riwayah_id: 3, year: 1440 })
    );
  });

  describe('recitation identity', () => {
    beforeEach(() => {
      form.addControl('reciter_id', new FormControl<number | null>(7));
      form.addControl('riwayah_id', new FormControl<number | null>(3));
      fixture.componentRef.setInput('category', 'recitation');
      fixture.detectChanges();
    });

    it('should clear the generated identifier when the reciter changes', () => {
      api.translate.and.returnValue(ok({ slug: 'recitation-saad-hafs' }));
      component.run('translate');

      form.patchValue({ reciter_id: 8 });

      expect(form.value.slug).toBe('');
      expect(form.controls['slug'].dirty).toBeFalse();
    });

    it('should clear the generated identifier when the riwayah changes', () => {
      api.translate.and.returnValue(ok({ slug: 'recitation-saad-hafs' }));
      component.run('translate');

      form.patchValue({ riwayah_id: 4 });

      expect(form.value.slug).toBe('');
    });

    it('should keep the identifier when an unrelated field changes', () => {
      api.translate.and.returnValue(ok({ slug: 'recitation-saad-hafs' }));
      component.run('translate');

      form.patchValue({ description_en: 'Edited' });

      expect(form.value.slug).toBe('recitation-saad-hafs');
    });

    it('should ignore an identifier for selections changed while the request ran', () => {
      const response = new Subject<AiTranslateResponse>();
      api.translate.and.returnValue(response.asObservable());

      component.run('translate');
      form.patchValue({ reciter_id: 8 });
      response.next({ fields: {}, sources: [], slug: 'recitation-saad-hafs' });
      response.complete();

      expect(form.value.slug).toBe('');
      expect(component.slugEditable()).toBeFalse();
    });
  });

  it('should not send slug inputs for a reciter', () => {
    fixture.componentRef.setInput('category', 'reciter');
    api.translate.and.returnValue(ok({}));

    component.run('translate');

    expect(api.translate.calls.mostRecent().args[0].slug_for).toBeUndefined();
  });

  it('should let the admin type the slug when the call fails', () => {
    api.translate.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));

    component.run('translate');

    expect(component.slugEditable()).toBeTrue();
    expect(form.value.slug).toBe('');
    expect(message.error).toHaveBeenCalled();
  });

  it('should let the admin type the slug when no slug comes back', () => {
    api.translate.and.returnValue(ok({ fields: { name: 'Tafsir' }, slug: null }));

    component.run('translate');

    expect(component.slugEditable()).toBeTrue();
  });

  it('should pass the context input to the api', () => {
    fixture.componentRef.setInput('context', { reciter: 'سعد الغامدي', riwayah: 'حفص' });
    api.translate.and.returnValue(ok({}));

    component.run('translate');

    expect(api.translate.calls.mostRecent().args[0].context).toEqual({
      reciter: 'سعد الغامدي',
      riwayah: 'حفص',
    });
  });

  it('should show quota message on 429', () => {
    api.translate.and.returnValue(throwError(() => new HttpErrorResponse({ status: 429 })));

    component.run('translate');

    expect(message.warning).toHaveBeenCalled();
    expect(message.error).not.toHaveBeenCalled();
    expect(component.loading()).toBeNull();
  });

  it('should show the wait-a-minute message on a per-minute 429', () => {
    const translate = TestBed.inject(TranslateService);
    spyOn(translate, 'instant').and.callFake((key: string | string[]) => String(key));
    api.translate.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 429,
            error: { error_name: 'ai_rate_limited', message: 'Too many AI requests' },
          })
      )
    );

    component.run('translate');

    expect(message.warning).toHaveBeenCalledWith('ADMIN.AI_TRANSLATE.RATE_LIMITED');
  });

  it('should show an error message on other failures', () => {
    api.translate.and.returnValue(throwError(() => new HttpErrorResponse({ status: 503 })));

    component.run('translate');

    expect(message.error).toHaveBeenCalled();
    expect(component.loading()).toBeNull();
  });

  describe('identifier row', () => {
    const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

    it('should show nothing about the identifier before any Arabic name is typed', () => {
      form.patchValue({ name_ar: '' });
      fixture.detectChanges();

      expect(text()).not.toContain('ADMIN.AI_TRANSLATE.IDENTIFIER');
      expect(text()).not.toContain('ADMIN.AI_TRANSLATE.SLUG_REQUIRED');
    });

    it('should show the generated identifier with an explanation', () => {
      api.translate.and.returnValue(ok({ slug: 'tafsir-saadi' }));

      component.run('translate');
      fixture.detectChanges();

      expect(text()).toContain('ADMIN.AI_TRANSLATE.IDENTIFIER');
      expect(text()).toContain('tafsir-saadi');
      const info = (fixture.nativeElement as HTMLElement).querySelector('[nz-tooltip]');
      expect(info).not.toBeNull();
    });

    it('should prompt for the identifier once the Arabic name is typed, without an error style', () => {
      fixture.detectChanges();

      expect(text()).toContain('ADMIN.AI_TRANSLATE.SLUG_REQUIRED');
      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          '.ai-translate-actions__slug-hint--error'
        )
      ).toBeNull();
    });

    it('should show the required message as an error after a save attempt without an identifier', () => {
      form.patchValue({ name_ar: '' });
      form.controls['slug'].markAsDirty();
      fixture.detectChanges();

      expect(text()).toContain('ADMIN.AI_TRANSLATE.SLUG_REQUIRED');
      expect(
        (fixture.nativeElement as HTMLElement).querySelector(
          '.ai-translate-actions__slug-hint--error'
        )
      ).not.toBeNull();
    });
  });
});
