import { TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideChevronRight, lucideClock } from '@ng-icons/lucide';
import { TranslateModule } from '@ngx-translate/core';
import { HierarchyNodeRow } from '../../models/hierarchy.models';
import { HierarchyTreeNodeComponent, formatTimingMs } from './hierarchy-tree-node.component';

describe('HierarchyTreeNodeComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HierarchyTreeNodeComponent, TranslateModule.forRoot()],
      providers: [provideIcons({ lucideChevronDown, lucideChevronRight, lucideClock })],
    }).compileComponents();
  });

  function render(row: HierarchyNodeRow, active = false) {
    const fixture = TestBed.createComponent(HierarchyTreeNodeComponent);
    fixture.componentRef.setInput('row', row);
    fixture.componentRef.setInput('active', active);
    fixture.detectChanges();
    return fixture;
  }

  it('formats timings as minutes, seconds and milliseconds', () => {
    expect(formatTimingMs(0)).toBe('0:00.000');
    expect(formatTimingMs(1270)).toBe('0:01.270');
    expect(formatTimingMs(754_005)).toBe('12:34.005');
  });

  it('exposes tree semantics on the host and emits when clicked', () => {
    // Arrange
    const fixture = render(
      {
        kind: 'node',
        id: 'hierarchy-node-1-1',
        depth: 2,
        posInSet: 1,
        setSize: 7,
        expandable: true,
        expanded: false,
        node: {
          level: 'ayah',
          key: '1:1',
          parentKey: '1',
          data: {
            ayah_key: '1:1',
            surah_number: 1,
            ayah_number: 1,
            text: 'بِسْمِ اللَّهِ',
            words_count: 2,
          },
        },
      },
      true
    );
    const host = fixture.nativeElement as HTMLElement;
    let picked = 0;
    fixture.componentInstance.pick.subscribe(() => picked++);

    // Act
    host.click();

    // Assert
    expect(host.id).toBe('hierarchy-node-1-1');
    expect(host.getAttribute('aria-level')).toBe('2');
    expect(host.getAttribute('aria-expanded')).toBe('false');
    expect(host.getAttribute('aria-selected')).toBe('true');
    expect(host.classList).toContain('hierarchy-tree-node--active');
    expect(host.textContent).toContain('1:1');
    expect(picked).toBe(1);
  });

  it('shows each code point of a letter and leaves aria-expanded off a leaf', () => {
    // Arrange / Act
    const fixture = render({
      kind: 'node',
      id: 'hierarchy-node-1-1-1-1',
      depth: 4,
      posInSet: 1,
      setSize: 3,
      expandable: false,
      expanded: false,
      node: {
        level: 'letter',
        key: '1:1:1:1',
        parentKey: '1:1:1',
        data: { letter_key: '1:1:1:1', word_key: '1:1:1', position: 1, text: 'بِ' },
      },
    });
    const host = fixture.nativeElement as HTMLElement;

    // Assert
    expect(fixture.componentInstance.codePoints()).toBe('U+0628 U+0650');
    expect(host.hasAttribute('aria-expanded')).toBeFalse();
  });
});
