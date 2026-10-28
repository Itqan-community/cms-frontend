import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import type { ContentEntry } from '../../models/asset-content.models';
import {
  GroupRangeCellComponent,
  type GroupRangeCellParams,
  formatPosition,
  parsePosition,
} from './group-range-cell.component';

function row(overrides: Partial<ContentEntry> = {}): ContentEntry {
  return {
    unit_type: 'ayah_group',
    unit_id: 1000003,
    label: '1:1 → 1:3',
    reference_text: '',
    sura: 1,
    aya: 1,
    cells: {},
    text: '',
    order: 1000003,
    group_from: { surah: 1, ayah: 1, word: null },
    group_to: { surah: 1, ayah: 3, word: null },
    ...overrides,
  };
}

describe('GroupRangeCellComponent', () => {
  let params: jasmine.SpyObj<
    Pick<GroupRangeCellParams, 'onRangeChange' | 'onExtend' | 'onInvalid'>
  >;

  function render(data: ContentEntry, editable = true) {
    TestBed.configureTestingModule({
      imports: [GroupRangeCellComponent, TranslateModule.forRoot()],
    });
    const fixture = TestBed.createComponent(GroupRangeCellComponent);
    params = jasmine.createSpyObj('params', ['onRangeChange', 'onExtend', 'onInvalid']);
    fixture.componentInstance.agInit({
      data,
      words: false,
      editable: () => editable,
      orphanLabel: 'Not in source',
      ...params,
    } as unknown as GroupRangeCellParams);
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  it('parses and formats ayah and word positions', () => {
    expect(parsePosition(' 2:255 ', false)).toEqual({ surah: 2, ayah: 255 });
    expect(parsePosition('2:255:4', true)).toEqual({ surah: 2, ayah: 255, word: 4 });
    expect(parsePosition('2:255', true)).toBeNull();
    expect(parsePosition('2:255:4', false)).toBeNull();
    expect(parsePosition('two', false)).toBeNull();
    expect(formatPosition({ surah: 2, ayah: 255, word: 4 })).toBe('2:255:4');
    expect(formatPosition({ surah: 2, ayah: 5, word: null })).toBe('2:5');
  });

  it('commits a typed end on Enter with the unchanged start', () => {
    // Arrange
    const { el } = render(row());
    const end = el.querySelectorAll('input')[1] as HTMLInputElement;

    // Act
    end.value = '1:5';
    end.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    // Assert
    expect(params.onRangeChange).toHaveBeenCalledWith(
      jasmine.objectContaining({ unit_id: 1000003 }),
      { surah: 1, ayah: 1 },
      { surah: 1, ayah: 5 }
    );
  });

  it('does nothing when the typed value did not change', () => {
    // Arrange
    const { el } = render(row());
    const start = el.querySelectorAll('input')[0] as HTMLInputElement;

    // Act
    start.dispatchEvent(new FocusEvent('blur'));

    // Assert
    expect(params.onRangeChange).not.toHaveBeenCalled();
  });

  it('reports an unreadable position and restores the value', () => {
    // Arrange
    const { el } = render(row());
    const start = el.querySelectorAll('input')[0] as HTMLInputElement;

    // Act
    start.value = 'abc';
    start.dispatchEvent(new FocusEvent('blur'));

    // Assert
    expect(params.onInvalid).toHaveBeenCalled();
    expect(params.onRangeChange).not.toHaveBeenCalled();
    expect(start.value).toBe('1:1');
  });

  it('grows and shrinks the end with the plus and minus buttons', () => {
    // Arrange
    const { el } = render(row());
    const [minus, plus] = Array.from(el.querySelectorAll('button'));

    // Act
    plus.click();
    minus.click();

    // Assert
    expect(params.onExtend.calls.allArgs()).toEqual([
      [jasmine.objectContaining({ unit_id: 1000003 }), 1],
      [jasmine.objectContaining({ unit_id: 1000003 }), -1],
    ]);
  });

  it('disables minus on a one-ayah group', () => {
    // Arrange / Act
    const { el } = render(row({ group_to: { surah: 1, ayah: 1, word: null } }));

    // Assert
    expect((el.querySelectorAll('button')[0] as HTMLButtonElement).disabled).toBeTrue();
  });

  it('shows only the label, marked when orphaned, when the row is not editable', () => {
    // Arrange / Act
    const { el } = render(row({ orphaned: true }), false);

    // Assert
    expect(el.querySelectorAll('input').length).toBe(0);
    expect(el.querySelectorAll('button').length).toBe(0);
    expect(el.textContent).toContain('1:1 → 1:3');
    expect(el.textContent).toContain('Not in source');
  });
});
