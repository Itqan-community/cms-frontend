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

  it('shows 5 features at a time, one dot per set, from whatever the data holds', () => {
    setReducedMotion(true);
    const fixture = render();

    expect(new Set(SHOWCASE_FEATURES.map((f) => f.key)).size).toBe(SHOWCASE_FEATURES.length);
    expect(shownKeys(fixture.nativeElement)).toEqual(['F1', 'F2', 'F3', 'F4', 'F5']);
    expect(fixture.nativeElement.querySelectorAll('.showcase__dot').length).toBe(
      Math.ceil(SHOWCASE_FEATURES.length / 5)
    );
  });

  it('never states how many features there are', () => {
    setReducedMotion(true);
    const fixture = render();

    const text: string = fixture.nativeElement.textContent;
    expect(text).not.toContain(String(SHOWCASE_FEATURES.length));
    expect(text).not.toContain('COUNT');
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

    const lastSet = SHOWCASE_FEATURES.slice((fixture.componentInstance.pageCount - 1) * 5);
    expect(shownKeys(fixture.nativeElement)).toEqual(lastSet.map((f) => f.key));
  });
});
