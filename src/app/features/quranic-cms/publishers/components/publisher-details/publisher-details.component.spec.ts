import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { Publisher } from '../../models/publishers-stats.models';
import { PublishersService } from '../../services/publishers.service';
import { PublisherDetailsComponent } from './publisher-details.component';

describe('PublisherDetailsComponent', () => {
  let fixture: ComponentFixture<PublisherDetailsComponent>;
  let component: PublisherDetailsComponent;
  let publishersServiceSpy: jasmine.SpyObj<PublishersService>;
  let modalSpy: jasmine.SpyObj<NzModalService>;
  let messageSpy: jasmine.SpyObj<NzMessageService>;
  let router: Router;

  const mockPublisher: Publisher = {
    id: '123',
    name_ar: 'كل آية',
    name_en: 'Every Ayah',
    country: 'Saudi Arabia',
    is_verified: true,
  };

  beforeEach(async () => {
    publishersServiceSpy = jasmine.createSpyObj('PublishersService', [
      'getPublisherById',
      'updatePublisher',
      'deletePublisher',
    ]);
    modalSpy = jasmine.createSpyObj('NzModalService', ['confirm']);
    messageSpy = jasmine.createSpyObj('NzMessageService', ['success', 'error']);

    publishersServiceSpy.getPublisherById.and.returnValue(of(mockPublisher));
    publishersServiceSpy.updatePublisher.and.returnValue(of({ ...mockPublisher, name_en: 'Updated' }));
    publishersServiceSpy.deletePublisher.and.returnValue(of(void 0));

    await TestBed.configureTestingModule({
      imports: [PublisherDetailsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: '123' })) },
        },
        { provide: PublishersService, useValue: publishersServiceSpy },
        { provide: NzModalService, useValue: modalSpy },
        { provide: NzMessageService, useValue: messageSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PublisherDetailsComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture.detectChanges();
  });

  it('should create and fetch publisher by route id', () => {
    expect(component).toBeTruthy();
    expect(publishersServiceSpy.getPublisherById).toHaveBeenCalledWith('123');
    expect((component as any).publisher?.id).toBe('123');
  });

  it('should open update confirmation and call update on confirm', async () => {
    const payload = { ...mockPublisher, name_en: 'Updated' };

    (component as any).confirmUpdate(payload);
    const confirmArg = modalSpy.confirm.calls.mostRecent().args[0] as any;

    expect(confirmArg.nzTitle).toBe('تأكيد التعديل');
    await confirmArg.nzOnOk();

    expect(publishersServiceSpy.updatePublisher).toHaveBeenCalledWith('123', payload);
    expect(messageSpy.success).toHaveBeenCalled();
  });

  it('should open delete confirmation with danger settings', () => {
    (component as any).showDeleteConfirm();
    const confirmArg = modalSpy.confirm.calls.mostRecent().args[0] as any;

    expect(confirmArg.nzTitle).toBe('تأكيد الحذف');
    expect(confirmArg.nzIconType).toBe('close-circle');
    expect(confirmArg.nzOkText).toBe('نعم، احذف');
    expect(confirmArg.nzOkDanger).toBeTrue();
  });

  it('should delete publisher and navigate back to list', async () => {
    (component as any).showDeleteConfirm();
    const confirmArg = modalSpy.confirm.calls.mostRecent().args[0] as any;

    await confirmArg.nzOnOk();

    expect(publishersServiceSpy.deletePublisher).toHaveBeenCalledWith('123');
    expect(router.navigate).toHaveBeenCalledWith(['/quranic-cms/publishers']);
    expect(messageSpy.success).toHaveBeenCalled();
  });

  it('should show error toast when details load fails', () => {
    publishersServiceSpy.getPublisherById.and.returnValue(throwError(() => new Error('fail')));

    const failedFixture = TestBed.createComponent(PublisherDetailsComponent);
    failedFixture.detectChanges();

    expect(messageSpy.error).toHaveBeenCalledWith('تعذر تحميل تفاصيل الناشر');
  });
});
