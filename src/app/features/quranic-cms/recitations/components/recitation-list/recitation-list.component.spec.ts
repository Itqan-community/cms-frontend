import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecitationListComponent } from './recitation-list.component';
import { RecitationsService } from '../../services/recitations.service';
import { RecitationItem } from '../../models/recitations.models';
import { NzMessageService } from 'ng-zorro-antd/message';
import { of, throwError } from 'rxjs';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { RecitationFilters } from '../recitation-search/recitation-search.component';
import { provideRouter } from '@angular/router';

describe('RecitationListComponent', () => {
  let component: RecitationListComponent;
  let fixture: ComponentFixture<RecitationListComponent>;
  let recitationsService: jasmine.SpyObj<RecitationsService>;
  let messageService: jasmine.SpyObj<NzMessageService>;

  const mockRecitation: RecitationItem = {
    id: 1,
    name: 'تلاوة اختبارية',
    description: 'وصف',
    publisher: { id: 1, name: 'دار النشر' },
    reciter: { id: 'r1', name: 'القارئ' },
    riwayah: { id: 1, name: 'حفص' },
    qiraah: { id: 1, name: 'عاصم' },
    surahs_count: 114,
  };

  const mockPaginatedResponse = {
    count: 1,
    next: null,
    previous: null,
    results: [mockRecitation],
  };

  beforeEach(async () => {
    const recSpy = jasmine.createSpyObj('RecitationsService', [
      'getRecitations',
      'deleteRecitation',
    ]);
    const msgSpy = jasmine.createSpyObj('NzMessageService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [RecitationListComponent, BrowserAnimationsModule],
      providers: [
        { provide: RecitationsService, useValue: recSpy },
        { provide: NzMessageService, useValue: msgSpy },
        provideRouter([]),
      ],
    }).compileComponents();

    recitationsService = TestBed.inject(RecitationsService) as jasmine.SpyObj<RecitationsService>;
    messageService = TestBed.inject(NzMessageService) as jasmine.SpyObj<NzMessageService>;

    recitationsService.getRecitations.and.returnValue(of(mockPaginatedResponse));

    fixture = TestBed.createComponent(RecitationListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // triggers ngOnInit and loadRecitations()
  });

  it('should create and load data on init', () => {
    expect(component).toBeTruthy();
    expect(recitationsService.getRecitations).toHaveBeenCalled();
    expect(component.recitations().length).toBe(1);
    expect(component.loading()).toBeFalse();
  });

  it('should reset to first page and reload when filters change', () => {
    const newFilters: RecitationFilters = { search: 'mishary', riwayah: '', type: 'مرتل' };
    component.page.set(5); // Change page manually

    component.onFiltersChanged(newFilters);

    expect(component.page()).toBe(1);
    expect(component.currentFilters()).toEqual(newFilters);
    expect(recitationsService.getRecitations).toHaveBeenCalled();
  });

  it('should change page and reload data', () => {
    const pageIndex = 3;
    component.onPageChange(pageIndex);

    expect(component.page()).toBe(pageIndex);
    expect(recitationsService.getRecitations).toHaveBeenCalled();
  });

  it('should call delete service and reload on success', () => {
    recitationsService.deleteRecitation.and.returnValue(of(void 0));
    const initialCallCount = (recitationsService.getRecitations as jasmine.Spy).calls.count();

    component.onDelete(1);

    expect(recitationsService.deleteRecitation).toHaveBeenCalledWith(1);
    expect(messageService.success).toHaveBeenCalled();
    expect(recitationsService.getRecitations).toHaveBeenCalledTimes(initialCallCount + 1);
  });

  it('should show error message when delete fails', () => {
    recitationsService.deleteRecitation.and.returnValue(
      throwError(() => new Error('Delete Error'))
    );

    component.onDelete(999);

    expect(messageService.error).toHaveBeenCalled();
  });

  it('should show error message when loading recitations fails', () => {
    recitationsService.getRecitations.and.returnValue(throwError(() => new Error('Network Error')));

    component.loadRecitations();

    expect(messageService.error).toHaveBeenCalledWith(
      'تعذر تحميل المصاحف الصوتية. يرجى المحاولة لاحقاً.'
    );
    expect(component.loading()).toBeFalse();
  });
});
