import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { RecitersPage } from './reciters.page';
import { RecitersService } from '../services/reciters.service';
import { RecitersResponse, RecitersStats } from '../models/reciter.model';

describe('RecitersPage', () => {
  let component: RecitersPage;
  let fixture: ComponentFixture<RecitersPage>;
  let recitersServiceSpy: jasmine.SpyObj<RecitersService>;
  let messageServiceSpy: jasmine.SpyObj<NzMessageService>;

  const mockStats: RecitersStats = {
    total_reciters: 6,
    total_contemporary: 4,
    total_nationalities: 3,
  };

  const mockResponse: RecitersResponse = {
    count: 2,
    next: null,
    previous: null,
    results: [
      { id: 1, name: 'القارئ الأول', bio: 'نبذة', recitations_count: 5 },
      { id: 2, name: 'القارئ الثاني', bio: '', recitations_count: 3 },
    ],
  };

  beforeEach(async () => {
    recitersServiceSpy = jasmine.createSpyObj('RecitersService', [
      'getReciters',
      'getStats',
      'createReciter',
    ]);
    messageServiceSpy = jasmine.createSpyObj('NzMessageService', ['success', 'error']);

    recitersServiceSpy.getStats.and.returnValue(of(mockStats));
    recitersServiceSpy.getReciters.and.returnValue(of(mockResponse));

    await TestBed.configureTestingModule({
      imports: [RecitersPage, ReactiveFormsModule],
      providers: [
        { provide: RecitersService, useValue: recitersServiceSpy },
        { provide: NzMessageService, useValue: messageServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecitersPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load stats on init', () => {
    expect(recitersServiceSpy.getStats).toHaveBeenCalled();
    expect(component.stats()).toEqual(mockStats);
    expect(component.statsLoading()).toBeFalse();
  });

  it('should load reciters on init', () => {
    expect(recitersServiceSpy.getReciters).toHaveBeenCalledWith('', 1, 12);
    expect(component.reciters().length).toBe(2);
    expect(component.totalReciters()).toBe(2);
    expect(component.recitersLoading()).toBeFalse();
  });

  it('should handle stats error gracefully', () => {
    recitersServiceSpy.getStats.and.returnValue(throwError(() => new Error('fail')));

    component.ngOnInit();

    expect(component.stats()?.isMock).toBeTrue();
  });

  it('should handle reciters error gracefully', () => {
    recitersServiceSpy.getReciters.and.returnValue(throwError(() => new Error('fail')));

    component.loadReciters();

    expect(component.reciters().length).toBe(0);
    expect(component.totalReciters()).toBe(0);
    expect(messageServiceSpy.error).toHaveBeenCalled();
  });

  it('should update page and reload on page change', () => {
    recitersServiceSpy.getReciters.calls.reset();

    component.onPageChange(3);

    expect(component.currentPage()).toBe(3);
    expect(recitersServiceSpy.getReciters).toHaveBeenCalledWith('', 3, 12);
  });

  it('should debounce search input', fakeAsync(() => {
    recitersServiceSpy.getReciters.calls.reset();

    const event = { target: { value: 'عبد' } } as unknown as Event;
    component.onSearchInput(event);

    expect(recitersServiceSpy.getReciters).not.toHaveBeenCalled();

    tick(400);

    expect(component.searchQuery()).toBe('عبد');
    expect(component.currentPage()).toBe(1);
    expect(recitersServiceSpy.getReciters).toHaveBeenCalled();
  }));

  it('should toggle add form visibility', () => {
    expect(component.showAddForm()).toBeFalse();

    component.toggleAddForm();
    expect(component.showAddForm()).toBeTrue();

    component.toggleAddForm();
    expect(component.showAddForm()).toBeFalse();
  });

  it('should not submit invalid form', () => {
    component.submitAddForm();

    expect(recitersServiceSpy.createReciter).not.toHaveBeenCalled();
  });

  it('should submit valid form and reload data', () => {
    const created = { id: 3, name: 'جديد', bio: '', recitations_count: 0 };
    recitersServiceSpy.createReciter.and.returnValue(of(created));
    recitersServiceSpy.getReciters.calls.reset();
    recitersServiceSpy.getStats.calls.reset();

    component.addForm.setValue({
      id: 'rec-3',
      name: 'جديد',
      name_en: '',
      nationality: '',
      birth_year: null,
      death_year: null,
      photo_url: '',
      bio: '',
    });

    component.submitAddForm();

    expect(recitersServiceSpy.createReciter).toHaveBeenCalled();
    expect(messageServiceSpy.success).toHaveBeenCalled();
    expect(component.showAddForm()).toBeFalse();
    expect(recitersServiceSpy.getReciters).toHaveBeenCalled();
    expect(recitersServiceSpy.getStats).toHaveBeenCalled();
  });

  it('should show error message when create fails', () => {
    recitersServiceSpy.createReciter.and.returnValue(throwError(() => new Error('fail')));

    component.addForm.setValue({
      id: 'rec-4',
      name: 'فشل',
      name_en: '',
      nationality: '',
      birth_year: null,
      death_year: null,
      photo_url: '',
      bio: '',
    });

    component.submitAddForm();

    expect(messageServiceSpy.error).toHaveBeenCalled();
  });

  it('should set sub tab', () => {
    component.setSubTab('recitations');
    expect(component.activeSubTab()).toBe('recitations');

    component.setSubTab('reciters');
    expect(component.activeSubTab()).toBe('reciters');
  });

  it('should return skeleton array of length 6', () => {
    expect(component.getSkeletonArray().length).toBe(6);
  });
});
