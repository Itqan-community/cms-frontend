import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';

import { TimingLevelBadgeComponent, type TimingLevel } from './timing-level-badge.component';

describe('TimingLevelBadgeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimingLevelBadgeComponent, TranslateModule.forRoot()],
    }).compileComponents();
  });

  function render(level: TimingLevel | null): HTMLElement {
    const fixture = TestBed.createComponent(TimingLevelBadgeComponent);
    fixture.componentRef.setInput('level', level);
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  for (const level of ['ayah', 'word', 'sentence'] as const) {
    it(`labels the ${level} level`, () => {
      const tag = render(level).querySelector('.timing-level-badge');
      expect(tag?.getAttribute('data-level')).toBe(level);
      expect(tag?.textContent).toContain(`TIMING_LEVEL.${level.toUpperCase()}`);
    });
  }

  it('renders nothing without a level', () => {
    expect(render(null).querySelector('.timing-level-badge')).toBeNull();
  });
});
