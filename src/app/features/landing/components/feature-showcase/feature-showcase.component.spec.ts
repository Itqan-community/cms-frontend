import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { SHOWCASE_FEATURES, SHOWCASE_INTERVAL_MS } from '../../data/features';
import { FeatureShowcaseComponent } from './feature-showcase.component';

describe('FeatureShowcaseComponent', () => {
  function setReducedMotion(reduce: boolean): void {
    spyOn(window, 'matchMedia').and.returnValue({ matches: reduce } as MediaQueryList);
  }

  function render() {
    TestBed.configureTestingModule({
      imports: [FeatureShowcaseComponent, TranslateModule.forRoot()],
    });
    const fixture = TestBed.createComponent(FeatureShowcaseComponent);
    fixture.detectChanges();
    return fixture;
  }

  function shownKeys(el: HTMLElement): string[] {
    return Array.from(el.querySelectorAll('.showcase__item b')).map((b) =>
      (b.textContent ?? '').trim().replace('LANDING.FEATURES.ITEMS.', '').replace('.H', '')
    );
  }

  it('lists 20 features and shows 5 at a time in 4 sets', () => {
    setReducedMotion(true);
    const fixture = render();

    expect(SHOWCASE_FEATURES.length).toBe(20);
    expect(new Set(SHOWCASE_FEATURES.map((f) => f.key)).size).toBe(20);
    expect(shownKeys(fixture.nativeElement)).toEqual(['F1', 'F2', 'F3', 'F4', 'F5']);
    expect(fixture.nativeElement.querySelectorAll('.showcase__dot').length).toBe(4);
  });

  it('rotates to the next set on its own and wraps around', fakeAsync(() => {
    setReducedMotion(false);
    const fixture = render();

    tick(SHOWCASE_INTERVAL_MS);
    fixture.detectChanges();
    expect(shownKeys(fixture.nativeElement)[0]).toBe('F6');

    tick(SHOWCASE_INTERVAL_MS * 3);
    fixture.detectChanges();
    expect(shownKeys(fixture.nativeElement)[0]).toBe('F1');
    fixture.destroy();
  }));

  it('does not rotate while hovered, nor once stopped', fakeAsync(() => {
    setReducedMotion(false);
    const fixture = render();
    const section: HTMLElement = fixture.nativeElement.querySelector('section');

    section.dispatchEvent(new Event('mouseenter'));
    tick(SHOWCASE_INTERVAL_MS);
    expect(fixture.componentInstance.page()).toBe(0);

    section.dispatchEvent(new Event('mouseleave'));
    fixture.componentInstance.toggle();
    tick(SHOWCASE_INTERVAL_MS * 2);
    expect(fixture.componentInstance.page()).toBe(0);
    fixture.destroy();
  }));

  it('starts stopped when the user prefers reduced motion', fakeAsync(() => {
    setReducedMotion(true);
    const fixture = render();

    expect(fixture.componentInstance.stopped()).toBeTrue();
    tick(SHOWCASE_INTERVAL_MS * 2);
    expect(fixture.componentInstance.page()).toBe(0);
    fixture.destroy();
  }));

  it('previous from the first set goes to the last one', () => {
    setReducedMotion(true);
    const fixture = render();

    fixture.componentInstance.go(-1);
    fixture.detectChanges();

    expect(shownKeys(fixture.nativeElement)).toEqual(['F16', 'F17', 'F18', 'F19', 'F20']);
  });
});
