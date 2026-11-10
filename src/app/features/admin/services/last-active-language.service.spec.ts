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
    expect(service.get('text', 'en-sahih')).toBeNull();
  });

  it('should save and retrieve language from sessionStorage', () => {
    service.set('text', 'en-sahih', 'fr');
    expect(service.get('text', 'en-sahih')).toBe('fr');
    expect(sessionStorage.getItem('cms:last-language:text:en-sahih')).toBe('fr');
  });

  it('should isolate keys by kind and slug', () => {
    service.set('text', 'slug-1', 'ar');
    service.set('mushaf', 'slug-1', 'en');
    service.set('text', 'slug-2', 'ur');

    expect(service.get('text', 'slug-1')).toBe('ar');
    expect(service.get('mushaf', 'slug-1')).toBe('en');
    expect(service.get('text', 'slug-2')).toBe('ur');
  });

  it('should handle sessionStorage exceptions gracefully on get', () => {
    spyOn(sessionStorage, 'getItem').and.throwError('Storage disabled');
    expect(service.get('text', 'en-sahih')).toBeNull();
  });

  it('should handle sessionStorage exceptions gracefully on set', () => {
    spyOn(sessionStorage, 'setItem').and.throwError('QuotaExceeded');
    expect(() => service.set('text', 'en-sahih', 'fr')).not.toThrow();
  });
});
