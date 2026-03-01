import { ComponentFixture, TestBed, fakeAsync } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { RecitersPage } from './reciters.page';
import { ReciterService } from '../../services/reciter.service';
import { ApiReciters } from '../../models/reciter.model';

const MOCK_RESPONSE: ApiReciters = {
  results: [
    { id: 1, name: 'Test Reciter 1', recitations_count: 3 },
    { id: 2, name: 'Test Reciter 2', recitations_count: 2 },
  ],
  count: 2,
};

describe('RecitersPage', () => {
  let component: RecitersPage;
  let fixture: ComponentFixture<RecitersPage>;
  let reciterServiceSpy: jasmine.SpyObj<ReciterService>;
  let messageServiceSpy: jasmine.SpyObj<NzMessageService>;

  beforeEach(async () => {
    reciterServiceSpy = jasmine.createSpyObj('ReciterService', ['getReciters']);
    messageServiceSpy = jasmine.createSpyObj('NzMessageService', ['error']);
    reciterServiceSpy.getReciters.and.returnValue(of(MOCK_RESPONSE));

    await TestBed.configureTestingModule({
      imports: [RecitersPage, TranslateModule.forRoot()],
      providers: [
        { provide: ReciterService, useValue: reciterServiceSpy },
        { provide: NzMessageService, useValue: messageServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecitersPage);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ─── User Story 1: Browse Reciters List ───────────────────────────────────

  it('US1: should set loading true while fetching and false after data arrives', fakeAsync(() => {
    const subject = new Subject<ApiReciters>();
    reciterServiceSpy.getReciters.and.returnValue(subject.asObservable());

    fixture.detectChanges(); // triggers ngOnInit → loadReciters()

    expect(component.loading()).toBeTrue();

    subject.next(MOCK_RESPONSE);
    subject.complete();

    expect(component.loading()).toBeFalse();
  }));

  it('US1: should populate reciters and total signals from API response', () => {
    fixture.detectChanges();

    expect(component.reciters()).toEqual(MOCK_RESPONSE.results);
    expect(component.total()).toBe(MOCK_RESPONSE.count);
  });

  it('US1: onPageChange should update page signal and re-fetch with new page', () => {
    fixture.detectChanges();
    reciterServiceSpy.getReciters.calls.reset();
    reciterServiceSpy.getReciters.and.returnValue(of(MOCK_RESPONSE));

    component.onPageChange(2);

    expect(component.page()).toBe(2);
    expect(reciterServiceSpy.getReciters).toHaveBeenCalledWith(2, 20);
  });

  it('US1: should call getReciters with page 1 and pageSize 20 on init', () => {
    fixture.detectChanges();

    expect(reciterServiceSpy.getReciters).toHaveBeenCalledWith(1, 20);
  });

  // ─── User Story 2: Empty State ────────────────────────────────────────────

  it('US2: isEmpty should be true when API returns no reciters', () => {
    reciterServiceSpy.getReciters.and.returnValue(of({ results: [], count: 0 }));

    fixture.detectChanges();

    expect(component.isEmpty()).toBeTrue();
  });

  it('US2: isEmpty should be false when reciters are present', () => {
    fixture.detectChanges();

    expect(component.isEmpty()).toBeFalse();
  });

  it('US2: isEmpty should be false while loading (spinner visible, no empty state)', fakeAsync(() => {
    const subject = new Subject<ApiReciters>();
    reciterServiceSpy.getReciters.and.returnValue(subject.asObservable());

    fixture.detectChanges();

    // While loading, reciters are empty but loading=true → isEmpty=false
    expect(component.loading()).toBeTrue();
    expect(component.isEmpty()).toBeFalse();

    subject.next({ results: [], count: 0 });
    subject.complete();

    // Now loading=false and reciters empty → isEmpty=true
    expect(component.isEmpty()).toBeTrue();
  }));

  // ─── User Story 3: API Error Handling ────────────────────────────────────

  it('US3: should display error toast when API call fails', () => {
    reciterServiceSpy.getReciters.and.returnValue(throwError(() => new Error('Network error')));

    fixture.detectChanges();

    expect(messageServiceSpy.error).toHaveBeenCalledTimes(1);
  });

  it('US3: should show empty state when API call fails', () => {
    reciterServiceSpy.getReciters.and.returnValue(throwError(() => new Error('Network error')));

    fixture.detectChanges();

    expect(component.reciters()).toEqual([]);
    expect(component.total()).toBe(0);
    expect(component.isEmpty()).toBeTrue();
  });

  it('US3: should set loading to false after error', () => {
    reciterServiceSpy.getReciters.and.returnValue(throwError(() => new Error('Error')));

    fixture.detectChanges();

    expect(component.loading()).toBeFalse();
  });
});
