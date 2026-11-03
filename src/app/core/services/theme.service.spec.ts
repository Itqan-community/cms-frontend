import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const root = document.documentElement;
  let applyTheme: jasmine.Spy;
  let savedApply: typeof window.itqanApplyTheme;

  beforeEach(() => {
    savedApply = window.itqanApplyTheme;
    applyTheme = jasmine.createSpy('itqanApplyTheme');
    window.itqanApplyTheme = applyTheme;
    root.setAttribute('data-theme', 'light');
    localStorage.removeItem('theme');
  });

  afterEach(() => {
    window.itqanApplyTheme = savedApply;
    root.setAttribute('data-theme', 'light');
    localStorage.removeItem('theme');
  });

  it('starts from the theme index.html applied', () => {
    root.setAttribute('data-theme', 'dark');
    expect(TestBed.inject(ThemeService).isDark()).toBeTrue();
  });

  it('saves the choice and switches once the styles are applied', () => {
    const service = TestBed.inject(ThemeService);

    service.toggle();

    expect(localStorage.getItem('theme')).toBe('dark');
    expect(applyTheme).toHaveBeenCalledWith('dark', jasmine.any(Function));
    expect(service.isDark()).toBeFalse();

    applyTheme.calls.mostRecent().args[1]();
    expect(service.isDark()).toBeTrue();
  });
});
