import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import type { ICellEditorParams } from 'ag-grid-community';

import type { ContentEntry } from '../../models/asset-content.models';
import { ContentTextCellEditorComponent } from './content-text-cell-editor.component';

describe('ContentTextCellEditorComponent', () => {
  const row: ContentEntry = {
    unit_type: 'ayah',
    unit_id: 262,
    label: '2:255',
    reference_text: 'ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ',
    sura: 2,
    aya: 255,
    text: 'existing tafsir',
    order: 262,
  };

  function create(overrides: Partial<ICellEditorParams<ContentEntry, string>> = {}) {
    const stopEditing = jasmine.createSpy('stopEditing');
    const fixture = TestBed.createComponent(ContentTextCellEditorComponent);
    fixture.componentInstance.agInit({
      value: row.text,
      data: row,
      eventKey: null,
      stopEditing,
      ...overrides,
    } as unknown as ICellEditorParams<ContentEntry, string>);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { fixture, editor: fixture.componentInstance, el, stopEditing };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentTextCellEditorComponent, TranslateModule.forRoot()],
    }).compileComponents();
  });

  it('shows the unit label and the ayah text above the editor', () => {
    // Arrange / Act
    const { el } = create();

    // Assert
    expect(el.querySelector('.text-editor__label')?.textContent).toContain('2:255');
    expect(el.querySelector('.text-editor__reference')?.textContent).toContain(row.reference_text);
  });

  it('omits the reference block when the unit has no reference text', () => {
    // Arrange / Act — page units carry no Quran text
    const { el } = create({ data: { ...row, reference_text: '' } });

    // Assert
    expect(el.querySelector('.text-editor__reference')).toBeNull();
  });

  it('starts from the cell value and returns the edited text', () => {
    // Arrange
    const { el, editor } = create();
    const textarea = el.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('existing tafsir');

    // Act
    textarea.value = 'edited';
    textarea.dispatchEvent(new Event('input'));

    // Assert
    expect(editor.getValue()).toBe('edited');
  });

  it('starts from the typed character when editing began with a keypress', () => {
    // Arrange / Act
    const { editor } = create({ eventKey: 'x' });

    // Assert
    expect(editor.getValue()).toBe('x');
  });

  it('starts empty when editing began with Backspace', () => {
    // Arrange / Act
    const { editor } = create({ eventKey: 'Backspace' });

    // Assert
    expect(editor.getValue()).toBe('');
  });

  it('opens as a popup', () => {
    // Arrange / Act
    const { editor } = create();

    // Assert
    expect(editor.isPopup()).toBeTrue();
  });

  it('commits on Done', () => {
    // Arrange
    const { el, editor, stopEditing } = create();
    const done = el.querySelectorAll('footer button')[1] as HTMLButtonElement;

    // Act
    done.click();

    // Assert
    expect(stopEditing).toHaveBeenCalled();
    expect(editor.isCancelAfterEnd()).toBeFalse();
  });

  it('discards the edit on Cancel', () => {
    // Arrange
    const { el, editor, stopEditing } = create();
    const cancel = el.querySelectorAll('footer button')[0] as HTMLButtonElement;

    // Act
    cancel.click();

    // Assert — stopEditing's argument only suppresses navigation, so the
    // grid must learn about the cancel from isCancelAfterEnd
    expect(stopEditing).toHaveBeenCalled();
    expect(editor.isCancelAfterEnd()).toBeTrue();
  });

  it('keeps Shift+Enter and arrow keys inside the textarea', () => {
    // Arrange
    const { el } = create();
    const textarea = el.querySelector('textarea') as HTMLTextAreaElement;
    const shiftEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true,
      bubbles: true,
    });
    const arrow = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true });
    const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    let bubbled = 0;
    el.addEventListener('keydown', () => bubbled++);

    // Act
    textarea.dispatchEvent(shiftEnter);
    textarea.dispatchEvent(arrow);
    textarea.dispatchEvent(enter);

    // Assert — only plain Enter reaches the grid (which commits the edit)
    expect(bubbled).toBe(1);
  });
});
