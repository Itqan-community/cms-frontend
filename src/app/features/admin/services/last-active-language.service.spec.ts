import { TestBed } from '@angular/core/testing';
import { LastActiveLanguageService } from './last-active-language.service';

describe('LastActiveLanguageService', () => {
  let service: LastActiveLanguageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LastActiveLanguageService],
    });
    service = TestBed.inject(LastActiveLanguageService);
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return null when no language is saved', () => {
    expect(service.get('translation', 'en-sahih')).toBeNull();
  });

  it('should save and retrieve language from sessionStorage', () => {
    service.set('translation', 'en-sahih', 'fr');
    expect(service.get('translation', 'en-sahih')).toBe('fr');
    expect(sessionStorage.getItem('cms:last-language:translation:en-sahih')).toBe('fr');
  });

  it('should isolate keys by kind and slug', () => {
    service.set('translation', 'slug-1', 'ar');
    service.set('tafsir', 'slug-1', 'en');
    service.set('translation', 'slug-2', 'ur');

    expect(service.get('translation', 'slug-1')).toBe('ar');
    expect(service.get('tafsir', 'slug-1')).toBe('en');
    expect(service.get('translation', 'slug-2')).toBe('ur');
  });

  it('should handle sessionStorage exceptions gracefully on get', () => {
    spyOn(sessionStorage, 'getItem').and.throwError('Storage disabled');
    expect(service.get('translation', 'en-sahih')).toBeNull();
  });

  it('should handle sessionStorage exceptions gracefully on set', () => {
    spyOn(sessionStorage, 'setItem').and.throwError('QuotaExceeded');
    expect(() => service.set('translation', 'en-sahih', 'fr')).not.toThrow();
  });
});
