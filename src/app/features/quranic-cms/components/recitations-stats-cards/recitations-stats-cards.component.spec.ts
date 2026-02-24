import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RecitationsStats } from '../../models/recitations-stats.model';
import { RecitationsStatsService } from '../../services/recitations-stats.service';
import { RecitationsStatsCardsComponent } from './recitations-stats-cards.component';

describe('RecitationsStatsCardsComponent (Quranic CMS)', () => {
  let component: RecitationsStatsCardsComponent;
  let fixture: ComponentFixture<RecitationsStatsCardsComponent>;
  let statsServiceSpy: jasmine.SpyObj<RecitationsStatsService>;

  beforeEach(async () => {
    const mockStats: RecitationsStats = {
      riwayas: 2,
      reciters: 6,
      recitations: 2,
      isMock: true,
    };

    statsServiceSpy = jasmine.createSpyObj('RecitationsStatsService', ['getStats']);
    statsServiceSpy.getStats.and.returnValue(of(mockStats));

    await TestBed.configureTestingModule({
      imports: [RecitationsStatsCardsComponent],
      providers: [{ provide: RecitationsStatsService, useValue: statsServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(RecitationsStatsCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should render KPI values correctly', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    const values = Array.from(
      compiled.querySelectorAll('.qcms-audio-stats__value')
    ).map((el) => el.textContent?.trim());

    expect(values).toEqual(['2', '2', '6']);
  });

  it('should show mock badge when using mock data', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.qcms-audio-stats__badge');
    expect(badge).not.toBeNull();
  });
});

