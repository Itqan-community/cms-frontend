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
    document.cookie = 'lang=; Path=/; Max-Age=0';
    TestBed.configureTestingModule({
      providers: [{ provide: TranslateService, useValue: translate }],
    });
  });

  afterEach(() => {
    localStorage.removeItem('lang');
    sessionStorage.removeItem('itqan-lang-ssr-reload');
    document.cookie = 'lang=; Path=/; Max-Age=0';
    document.documentElement.removeAttribute('lang');
  });

  it('loads the default language on success', async () => {
    translate.use.and.returnValue(of({}));
    await TestBed.runInInjectionContext(() => initializeAppTranslations());
    expect(translate.addLangs).toHaveBeenCalledWith(['ar', 'en']);
    expect(translate.setFallbackLang).toHaveBeenCalledWith('ar');
    expect(translate.use).toHaveBeenCalledOnceWith('ar');
    expect(document.cookie).not.toContain('lang=');
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

  it('copies the language into the cookie the SSR server reads', async () => {
    localStorage.setItem('lang', 'en');
    translate.use.and.returnValue(of({}));
    await TestBed.runInInjectionContext(() => initializeAppTranslations());
    expect(document.cookie).toContain('lang=en');
  });

  it('falls back to the cookie when localStorage has no language', async () => {
    document.cookie = 'lang=en; Path=/';
    translate.use.and.returnValue(of({}));
    await TestBed.runInInjectionContext(() => initializeAppTranslations());
    expect(translate.use).toHaveBeenCalledOnceWith('en');
  });

  it('does not overwrite localStorage or cookie when ?lang=en is present', async () => {
    localStorage.setItem('lang', 'ar');
    document.cookie = 'lang=ar; Path=/';
    translate.use.and.returnValue(of({}));
    const previousUrl = `${window.location.pathname}${window.location.search}`;
    history.replaceState(null, '', `${window.location.pathname}?lang=en`);
    try {
      await TestBed.runInInjectionContext(() => initializeAppTranslations());
      expect(translate.use).toHaveBeenCalledOnceWith('en');
      expect(localStorage.getItem('lang')).toBe('ar');
      expect(document.cookie).toContain('lang=ar');
      expect(document.cookie).not.toContain('lang=en');
    } finally {
      history.replaceState(null, '', previousUrl);
    }
  });

  it('clears the reload loop guard once document.documentElement.lang matches', async () => {
    localStorage.setItem('lang', 'en');
    sessionStorage.setItem('itqan-lang-ssr-reload', '1');
    document.documentElement.lang = 'en';
    translate.use.and.returnValue(of({}));
    await TestBed.runInInjectionContext(() => initializeAppTranslations());
    expect(sessionStorage.getItem('itqan-lang-ssr-reload')).toBeNull();
  });
});
