import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { DEFAULT_UI_LANGUAGE, initializeAppTranslations } from './translate-app.initializer';

describe('initializeAppTranslations', () => {
  it('loads the stored language before bootstrap continues', async () => {
    localStorage.setItem('lang', 'en');
    const useSpy = jasmine.createSpy('use').and.returnValue(of({}));
    const setFallbackSpy = jasmine.createSpy('setFallbackLang');
    const addLangsSpy = jasmine.createSpy('addLangs');

    TestBed.configureTestingModule({
      providers: [
        provideTranslateService(),
        {
          provide: TranslateService,
          useValue: {
            addLangs: addLangsSpy,
            setFallbackLang: setFallbackSpy,
            use: useSpy,
          },
        },
      ],
    });

    await TestBed.runInInjectionContext(() => initializeAppTranslations());

    expect(addLangsSpy).toHaveBeenCalledWith(['ar', 'en']);
    expect(setFallbackSpy).toHaveBeenCalledWith(DEFAULT_UI_LANGUAGE);
    expect(useSpy).toHaveBeenCalledWith('en');
  });
});
