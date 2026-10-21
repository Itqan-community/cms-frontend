import { TestBed } from '@angular/core/testing';
import { ContentColumnHeaderComponent } from './content-column-header.component';

describe('ContentColumnHeaderComponent', () => {
  function render(canManage: boolean) {
    const fixture = TestBed.createComponent(ContentColumnHeaderComponent);
    const openManage = jasmine.createSpy('openManage');
    fixture.componentInstance.agInit({
      displayName: 'Answer',
      columnKey: 'answer',
      canManage,
      openManage,
      enableMenu: false,
      showColumnMenu: () => void 0,
    } as never);
    fixture.detectChanges();
    return { element: fixture.nativeElement as HTMLElement, openManage };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentColumnHeaderComponent],
    }).compileComponents();
  });

  it('shows the label with the key beside it', () => {
    // Arrange / Act
    const { element } = render(false);

    // Assert
    expect(element.textContent).toContain('Answer');
    expect(element.textContent).toContain('answer');
  });

  it('offers the gear only to users who may manage columns', () => {
    // Arrange / Act
    const allowed = render(true);
    const denied = render(false);
    allowed.element.querySelector<HTMLButtonElement>('.content-col-header__manage')!.click();

    // Assert
    expect(denied.element.querySelector('.content-col-header__manage')).toBeNull();
    expect(allowed.openManage).toHaveBeenCalledWith('answer');
  });
});
