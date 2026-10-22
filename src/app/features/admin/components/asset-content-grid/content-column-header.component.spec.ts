import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { ContentColumnHeaderComponent } from './content-column-header.component';

/** A stand-in for AG Grid's column: its filter state and filter-change listeners. */
function fakeColumn(active = false) {
  const listeners: (() => void)[] = [];
  return {
    active,
    isFilterActive(): boolean {
      return this.active;
    },
    addEventListener: (_type: string, listener: () => void) => listeners.push(listener),
    removeEventListener: () => void 0,
    fire: () => listeners.forEach((listener) => listener()),
  };
}

describe('ContentColumnHeaderComponent', () => {
  function render(
    canManage: boolean,
    { displayName = 'Reply', column = fakeColumn(), enableMenu = false } = {}
  ) {
    const fixture = TestBed.createComponent(ContentColumnHeaderComponent);
    const openManage = jasmine.createSpy('openManage');
    fixture.componentInstance.agInit({
      displayName,
      columnKey: 'answer',
      canManage,
      openManage,
      enableMenu,
      column,
      showColumnMenu: () => void 0,
    } as never);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement, openManage };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentColumnHeaderComponent, TranslateModule.forRoot()],
    }).compileComponents();
  });

  it('shows the label with the key beside it', () => {
    // Arrange / Act
    const { element } = render(false);

    // Assert
    expect(element.textContent).toContain('Reply');
    expect(element.textContent).toContain('answer');
  });

  it('does not repeat a key that only differs from the label by case', () => {
    // Arrange / Act
    const { element } = render(false, { displayName: 'Answer' });

    // Assert
    expect(element.querySelector('.content-col-header__key')).toBeNull();
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

  it('names its icon-only buttons for screen readers', () => {
    // Arrange / Act
    const { element } = render(true, { enableMenu: true });

    // Assert
    const buttons = Array.from(element.querySelectorAll('button'));
    expect(buttons.length).toBe(2);
    expect(buttons.every((button) => !!button.getAttribute('aria-label'))).toBeTrue();
  });

  it('marks the column while a filter is active on it', () => {
    // Arrange
    const column = fakeColumn();
    const { fixture, element } = render(false, { column });
    expect(element.querySelector('.content-col-header__filtered')).toBeNull();

    // Act
    column.active = true;
    column.fire();
    fixture.detectChanges();

    // Assert
    expect(element.querySelector('.content-col-header__filtered')).not.toBeNull();
  });
});
