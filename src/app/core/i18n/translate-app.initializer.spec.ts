import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import { initializeAppTranslations } from './translate-app.initializer';

describe('initializeAppTranslations', () => {
  let translate: jasmine.SpyObj<TranslateService>;

  beforeEach(() => {
    translate = jasmine.createSpyObj<TranslateService>('TranslateService', [
      'addLangs',
      'setFallbackLang',
      'use',
    ]);
    localStorage.removeItem('lang');
    TestBed.configureTestingModule({
      providers: [{ provide: TranslateService, useValue: translate }],
    });
  });

  it('loads the default language on success', async () => {
    translate.use.and.returnValue(of({}));
    await TestBed.runInInjectionContext(() => initializeAppTranslations());
    expect(translate.addLangs).toHaveBeenCalledWith(['ar', 'en']);
    expect(translate.setFallbackLang).toHaveBeenCalledWith('ar');
    expect(translate.use).toHaveBeenCalledOnceWith('ar');
  });

  it('retries once after a failed load then succeeds', async () => {
    translate.use.and.returnValues(
      throwError(() => new Error('network')),
      of({})
    );
    await TestBed.runInInjectionContext(() => initializeAppTranslations());
    expect(translate.use).toHaveBeenCalledTimes(2);
  });

  it('resolves without throwing when both attempts fail', async () => {
    translate.use.and.returnValue(throwError(() => new Error('network')));
    const spy = spyOn(console, 'error');
    await expectAsync(
      TestBed.runInInjectionContext(() => initializeAppTranslations())
    ).toBeResolved();
    expect(translate.use).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalled();
  });

  it('uses localStorage lang when set', async () => {
    localStorage.setItem('lang', 'en');
    translate.use.and.returnValue(of({}));
    await TestBed.runInInjectionContext(() => initializeAppTranslations());
    expect(translate.use).toHaveBeenCalledOnceWith('en');
  });
});
