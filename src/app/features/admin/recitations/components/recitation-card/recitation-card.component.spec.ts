import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RecitationCardComponent } from './recitation-card.component';
import { RecitationItem } from '../../models/recitations.models';
import { NzModalService } from 'ng-zorro-antd/modal';
import { provideRouter } from '@angular/router';

describe('RecitationCardComponent', () => {
  let component: RecitationCardComponent;
  let fixture: ComponentFixture<RecitationCardComponent>;
  let modalService: jasmine.SpyObj<NzModalService>;

  const mockRecitation: RecitationItem = {
    id: 1,
    name: 'Test Recitation',
    description: 'A test description',
    publisher: { id: 1, name: 'Publisher' },
    reciter: { id: 'r1', name: 'المقرئ', name_en: 'The Reciter' },
    riwayah: { id: 1, name: 'حفص' },
    qiraah: { id: 1, name: 'عاصم' },
    surahs_count: 114,
    style: 'مرتل',
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('NzModalService', ['confirm']);

    await TestBed.configureTestingModule({
      imports: [RecitationCardComponent],
      providers: [{ provide: NzModalService, useValue: spy }, provideRouter([])],
    }).compileComponents();

    modalService = TestBed.inject(NzModalService) as jasmine.SpyObj<NzModalService>;
    fixture = TestBed.createComponent(RecitationCardComponent);
    component = fixture.componentInstance;
    component.recitation = mockRecitation;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should correctly format English name with style', () => {
    expect(component.nameEnWithStyle).toBe('The Reciter (Murattal)');

    component.recitation = { ...mockRecitation, style: 'مجود' };
    expect(component.nameEnWithStyle).toBe('The Reciter (Mujawwad)');
  });

  it('should emit delete event when delete is confirmed', () => {
    spyOn(component.delete, 'emit');

    // Simulate user clicking delete
    component.showDeleteConfirm();

    expect(modalService.confirm).toHaveBeenCalled();
    const confirmArgs = modalService.confirm.calls.mostRecent()?.args[0];
    if (confirmArgs?.nzOnOk) {
      const okCallback = confirmArgs.nzOnOk as Function;
      okCallback();
    }

    expect(component.delete.emit).toHaveBeenCalledWith(mockRecitation.id);
  });
});
