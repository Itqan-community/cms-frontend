import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { TimingCoverage } from '../../models/recitations.models';
import { TimingCoverageTagComponent } from './timing-coverage-tag.component';

describe('TimingCoverageTagComponent', () => {
  let fixture: ComponentFixture<TimingCoverageTagComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimingCoverageTagComponent, TranslateModule.forRoot()],
      providers: [provideNoopAnimations()],
    }).compileComponents();
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', {
      ADMIN: {
        RECITATIONS: {
          TIMINGS: {
            STATUS: {
              FULL: 'Timed',
              PARTIAL: 'Partial · {{percent}}%',
              NONE: 'No timing',
              TOOLTIP: '{{timed}} of {{total}} ayahs timed',
              NO_TRACKS: 'No tracks yet',
            },
          },
        },
      },
    });
    translate.use('en');
    fixture = TestBed.createComponent(TimingCoverageTagComponent);
  });

  function render(coverage: TimingCoverage): HTMLElement {
    fixture.componentRef.setInput('coverage', coverage);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('nz-tag') as HTMLElement;
  }

  it('shows a green "Timed" tag when every ayah is timed', () => {
    const tag = render({ timing_status: 'full', timed_ayahs_count: 7, ayahs_count: 7 });
    expect(tag.textContent?.trim()).toBe('Timed');
    expect(tag.classList).toContain('ant-tag-green');
  });

  it('shows the floored percentage when partially timed', () => {
    const tag = render({ timing_status: 'partial', timed_ayahs_count: 6235, ayahs_count: 6236 });
    expect(tag.textContent?.trim()).toBe('Partial · 99%');
    expect(tag.classList).toContain('ant-tag-orange');
  });

  it('never shows 0% once something is timed', () => {
    const tag = render({ timing_status: 'partial', timed_ayahs_count: 1, ayahs_count: 6236 });
    expect(tag.textContent?.trim()).toBe('Partial · 1%');
  });

  it('shows "No timing" without timed ayahs', () => {
    const tag = render({ timing_status: 'none', timed_ayahs_count: 0, ayahs_count: 0 });
    expect(tag.textContent?.trim()).toBe('No timing');
    expect(tag.getAttribute('data-status')).toBe('none');
  });
});
