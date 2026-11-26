import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { type ModalOptions, NzModalService } from 'ng-zorro-antd/modal';
import { of, Subject, throwError } from 'rxjs';
import { AiTranslateResponse, AiTranslateService } from '../../services/ai-translate.service';
import { EMPTY_VERSION_TEXT, VersionText } from '../../utils/version-text.util';
import { AiTranslateVersionTextComponent } from './ai-translate-version-text.component';

describe('AiTranslateVersionTextComponent', () => {
  let fixture: ComponentFixture<AiTranslateVersionTextComponent>;
  let component: AiTranslateVersionTextComponent;
  let api: jasmine.SpyObj<AiTranslateService>;
  let message: jasmine.SpyObj<NzMessageService>;
  let modal: jasmine.SpyObj<NzModalService>;
  let emitted: Partial<VersionText>[];

  const ok = (fields: AiTranslateResponse['fields']) =>
    of({ fields, sources: [], slug: null } as AiTranslateResponse);
  const setText = (text: Partial<VersionText>) =>
    fixture.componentRef.setInput('text', { ...EMPTY_VERSION_TEXT, ...text });

  beforeEach(() => {
    api = jasmine.createSpyObj<AiTranslateService>('AiTranslateService', ['translate']);
    message = jasmine.createSpyObj<NzMessageService>('NzMessageService', [
      'info',
      'success',
      'error',
      'warning',
    ]);
    modal = jasmine.createSpyObj<NzModalService>('NzModalService', ['confirm']);
    TestBed.configureTestingModule({
      imports: [AiTranslateVersionTextComponent, TranslateModule.forRoot()],
      providers: [
        { provide: AiTranslateService, useValue: api },
        { provide: NzMessageService, useValue: message },
        { provide: NzModalService, useValue: modal },
      ],
    });
    fixture = TestBed.createComponent(AiTranslateVersionTextComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('category', 'text');
    setText({});
    emitted = [];
    component.translated.subscribe((v) => emitted.push(v));
    fixture.detectChanges();
  });

  it('translates the empty English fields and sends filled Arabic as reference', () => {
    setText({ label_ar: 'تحديث', label_en: 'Update', summary_ar: 'تصحيح أخطاء' });
    api.translate.and.returnValue(ok({ version_summary: 'Fix typos' }));

    component.run();

    expect(api.translate).toHaveBeenCalledOnceWith({
      mode: 'translate',
      category: 'text',
      fields: { version_summary: 'تصحيح أخطاء' },
      reference: { version_name: 'تحديث' },
    });
    expect(modal.confirm).not.toHaveBeenCalled();
    expect(emitted).toEqual([{ summary_en: 'Fix typos' }]);
    expect(message.success).toHaveBeenCalled();
  });

  it('asks before replacing English that is already filled, and replaces it on OK', () => {
    setText({ summary_ar: 'تصحيح أخطاء', summary_en: 'Typed by user' });
    api.translate.and.returnValue(ok({ version_summary: 'Fix typos' }));

    component.run();

    expect(api.translate).not.toHaveBeenCalled();
    expect(modal.confirm).toHaveBeenCalledTimes(1);
    const options = modal.confirm.calls.mostRecent().args[0] as ModalOptions;
    (options.nzOnOk as () => void)();
    expect(api.translate).toHaveBeenCalledOnceWith({
      mode: 'translate',
      category: 'text',
      fields: { version_summary: 'تصحيح أخطاء' },
    });
    expect(emitted).toEqual([{ summary_en: 'Fix typos' }]);
  });

  it('keeps English the user typed while the request ran', () => {
    setText({ summary_ar: 'تصحيح أخطاء' });
    const response = new Subject<AiTranslateResponse>();
    api.translate.and.returnValue(response);

    component.run();
    expect(component.loading()).toBeTrue();
    setText({ summary_ar: 'تصحيح أخطاء', summary_en: 'Typed meanwhile' });
    response.next({ fields: { version_summary: 'Fix typos' }, sources: [], slug: null });

    expect(component.loading()).toBeFalse();
    expect(emitted).toEqual([]);
  });

  it('asks for Arabic first when there is none', () => {
    setText({ summary_en: 'Only English' });

    component.run();

    expect(api.translate).not.toHaveBeenCalled();
    expect(message.info).toHaveBeenCalledWith('ADMIN.AI_TRANSLATE.NEED_VERSION_ARABIC');
  });

  it("shows the backend's message when the call fails", () => {
    setText({ summary_ar: 'تصحيح أخطاء' });
    api.translate.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 503,
            error: { error_name: 'ai_unavailable', message: 'The AI service is unavailable.' },
          })
      )
    );

    component.run();

    expect(component.loading()).toBeFalse();
    expect(message.error).toHaveBeenCalledWith('The AI service is unavailable.');
    expect(emitted).toEqual([]);
  });

  it('shows the per-minute warning on ai_rate_limited', () => {
    setText({ summary_ar: 'تصحيح أخطاء' });
    api.translate.and.returnValue(
      throwError(
        () => new HttpErrorResponse({ status: 429, error: { error_name: 'ai_rate_limited' } })
      )
    );

    component.run();

    expect(message.warning).toHaveBeenCalledWith('ADMIN.AI_TRANSLATE.RATE_LIMITED');
  });
});
