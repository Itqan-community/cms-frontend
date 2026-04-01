import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecitationsStatsCardsComponent } from './recitations-stats-cards.component';
import { RecitationsStatsService } from '../../../services/recitations-stats.service';
import { of, throwError } from 'rxjs';
import { RecitationsStats } from '../../../models/recitations-stats.model';

describe('RecitationsStatsCardsComponent', () => {
  let component: RecitationsStatsCardsComponent;
  let fixture: ComponentFixture<RecitationsStatsCardsComponent>;
  let statsService: jasmine.SpyObj<RecitationsStatsService>;

  const mockStats: RecitationsStats = {
    riwayas: 2,
    reciters: 6,
    recitations: 4,
    isMock: false,
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('RecitationsStatsService', ['getStats']);

    await TestBed.configureTestingModule({
      imports: [RecitationsStatsCardsComponent],
      providers: [{ provide: RecitationsStatsService, useValue: spy }],
    }).compileComponents();

    statsService = TestBed.inject(
      RecitationsStatsService
    ) as jasmine.SpyObj<RecitationsStatsService>;
    statsService.getStats.and.returnValue(of(mockStats));

    fixture = TestBed.createComponent(RecitationsStatsCardsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load stats on init', () => {
    expect(component).toBeTruthy();
    expect(statsService.getStats).toHaveBeenCalled();
    expect(component.stats()).toEqual(mockStats);
    expect(component.loading()).toBeFalse();
  });

  it('should handle API failure gracefully with safe fallback', () => {
    statsService.getStats.and.returnValue(throwError(() => new Error('Network error')));

    // Trigger onInit again
    component.ngOnInit();

    expect(component.stats()).toEqual({
      riwayas: 0,
      reciters: 0,
      recitations: 0,
      isMock: true,
    });
    expect(component.loading()).toBeFalse();
  });

  it('should update computed property usingMock correctly', () => {
    expect(component.usingMock()).toBeFalse();

    component.stats.set({ ...mockStats, isMock: true });
    expect(component.usingMock()).toBeTrue();
  });
});
