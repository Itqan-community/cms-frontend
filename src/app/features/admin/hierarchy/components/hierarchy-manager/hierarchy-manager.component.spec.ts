import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideIcons } from '@ng-icons/core';
import {
  lucideAlertCircle,
  lucideChevronDown,
  lucideChevronLeft,
  lucideChevronRight,
  lucideClock,
  lucideInbox,
  lucideSearch,
} from '@ng-icons/lucide';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, of, throwError } from 'rxjs';
import {
  HierarchyAyah,
  HierarchyLetter,
  HierarchyList,
  HierarchySearchResult,
  HierarchySurah,
  HierarchyWord,
} from '../../models/hierarchy.models';
import { HierarchyService } from '../../services/hierarchy.service';
import {
  HIERARCHY_SEARCH_DEBOUNCE_MS,
  HierarchyManagerComponent,
} from './hierarchy-manager.component';

function list<T>(results: T[]): HierarchyList<T> {
  return { results, count: results.length };
}

const SURAHS: HierarchySurah[] = [
  {
    surah_number: 1,
    name_ar: 'الفاتحة',
    name_en: 'Al-Fatihah',
    revelation_type: 'meccan',
    ayahs_count: 7,
  },
  {
    surah_number: 2,
    name_ar: 'البقرة',
    name_en: 'Al-Baqarah',
    revelation_type: 'medinan',
    ayahs_count: 286,
  },
];

const AYAHS: HierarchyAyah[] = [
  { ayah_key: '1:1', surah_number: 1, ayah_number: 1, text: 'بِسْمِ اللَّهِ', words_count: 2 },
  { ayah_key: '1:2', surah_number: 1, ayah_number: 2, text: 'الْحَمْدُ لِلَّهِ', words_count: 2 },
];

const WORDS: HierarchyWord[] = [
  {
    word_key: '1:1:1',
    ayah_key: '1:1',
    position: 1,
    text: 'بِسْمِ',
    letters_count: 3,
    start_ms: 0,
    end_ms: 1270,
  },
  { word_key: '1:1:2', ayah_key: '1:1', position: 2, text: 'اللَّهِ', letters_count: 4 },
];

const LETTERS: HierarchyLetter[] = [
  { letter_key: '1:1:1:1', word_key: '1:1:1', position: 1, text: 'بِ' },
  { letter_key: '1:1:1:2', word_key: '1:1:1', position: 2, text: 'سْ' },
  { letter_key: '1:1:1:3', word_key: '1:1:1', position: 3, text: 'مِ' },
];

const AYAH_RESULT: HierarchySearchResult = {
  level: 'ayah',
  surah_number: 1,
  surah_name_ar: 'الفاتحة',
  surah_name_en: 'Al-Fatihah',
  ayah_key: '1:2',
  ayah_number: 2,
  text: 'الْحَمْدُ لِلَّهِ',
};

describe('HierarchyManagerComponent', () => {
  let fixture: ComponentFixture<HierarchyManagerComponent>;
  let component: HierarchyManagerComponent;
  let service: jasmine.SpyObj<HierarchyService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj<HierarchyService>('HierarchyService', [
      'getSurahs',
      'getAyahs',
      'getWords',
      'getLetters',
      'search',
    ]);
    service.getSurahs.and.returnValue(of(list(SURAHS)));
    service.getAyahs.and.returnValue(of(list(AYAHS)));
    service.getWords.and.returnValue(of(list(WORDS)));
    service.getLetters.and.returnValue(of(list(LETTERS)));
    service.search.and.returnValue(of(list([AYAH_RESULT])));

    await TestBed.configureTestingModule({
      imports: [HierarchyManagerComponent, TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        provideIcons({
          lucideAlertCircle,
          lucideChevronDown,
          lucideChevronLeft,
          lucideChevronRight,
          lucideClock,
          lucideInbox,
          lucideSearch,
        }),
        { provide: HierarchyService, useValue: service },
      ],
    }).compileComponents();
  });

  function create(): void {
    fixture = TestBed.createComponent(HierarchyManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function el(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function tree(): HTMLElement {
    return el().querySelector('[role="tree"]') as HTMLElement;
  }

  /** Dispatches a key on the tree and returns whether the component handled (prevented) it. */
  function press(key: string, target: HTMLElement = tree()): boolean {
    const event = new KeyboardEvent('keydown', { key, cancelable: true, bubbles: true });
    target.dispatchEvent(event);
    fixture.detectChanges();
    return event.defaultPrevented;
  }

  function nodeKeys(): string[] {
    return component.rows().map((row) => (row.kind === 'node' ? row.node.key : `<${row.kind}>`));
  }

  function rowFor(key: string) {
    const row = component.rows().find((item) => item.kind === 'node' && item.node.key === key);
    if (row?.kind !== 'node') {
      throw new Error(`no row for ${key}`);
    }
    return row;
  }

  function drillToFirstLetter(): void {
    component.onRowPick(rowFor('1'));
    component.onRowPick(rowFor('1:1'));
    component.onRowPick(rowFor('1:1:1'));
    component.onRowPick(rowFor('1:1:1:1'));
    fixture.detectChanges();
  }

  describe('loading the surahs', () => {
    it('shows a skeleton until the surahs arrive, then the tree', () => {
      // Arrange
      const surahs$ = new Subject<HierarchyList<HierarchySurah>>();
      service.getSurahs.and.returnValue(surahs$);

      // Act
      create();

      // Assert: loading
      expect(el().querySelector('nz-skeleton')).not.toBeNull();
      expect(tree()).toBeNull();

      // Act: loaded
      surahs$.next(list(SURAHS));
      surahs$.complete();
      fixture.detectChanges();

      // Assert
      expect(el().querySelector('nz-skeleton')).toBeNull();
      expect(tree()).not.toBeNull();
      expect(nodeKeys()).toEqual(['1', '2']);
      expect(component.totalAyahs()).toBe(293);
    });

    it('renders surahs as level 1 tree items with their set position', fakeAsync(() => {
      // Act
      create();
      tick();
      fixture.detectChanges();

      // Assert
      const items = Array.from(el().querySelectorAll('app-hierarchy-tree-node'));
      expect(items.length).toBe(2);
      expect(items[1].getAttribute('role')).toBe('treeitem');
      expect(items[1].getAttribute('aria-level')).toBe('1');
      expect(items[1].getAttribute('aria-posinset')).toBe('2');
      expect(items[1].getAttribute('aria-setsize')).toBe('2');
      expect(items[1].getAttribute('aria-expanded')).toBe('false');
      expect(items[1].textContent).toContain('البقرة');
    }));

    it('shows an error with a retry that reloads the surahs', () => {
      // Arrange
      service.getSurahs.and.returnValue(throwError(() => new Error('offline')));
      create();
      expect(el().textContent).toContain('ADMIN.HIERARCHY.LOAD_ERROR_TITLE');

      // Act
      service.getSurahs.and.returnValue(of(list(SURAHS)));
      (el().querySelector('app-state-message button') as HTMLButtonElement).click();
      fixture.detectChanges();

      // Assert
      expect(service.getSurahs).toHaveBeenCalledTimes(2);
      expect(tree()).not.toBeNull();
    });

    it('shows an empty state when the dataset has no surahs', () => {
      // Arrange
      service.getSurahs.and.returnValue(of(list<HierarchySurah>([])));

      // Act
      create();

      // Assert
      expect(tree()).toBeNull();
      expect(el().textContent).toContain('ADMIN.HIERARCHY.EMPTY_TITLE');
    });
  });

  describe('drilling down', () => {
    beforeEach(() => create());

    it('loads ayahs only when a surah is opened, showing a loading row meanwhile', () => {
      // Arrange
      const ayahs$ = new Subject<HierarchyList<HierarchyAyah>>();
      service.getAyahs.and.returnValue(ayahs$);
      expect(service.getAyahs).not.toHaveBeenCalled();

      // Act
      component.onRowPick(rowFor('1'));

      // Assert: loading placeholder under the surah
      expect(service.getAyahs).toHaveBeenCalledOnceWith(1);
      expect(nodeKeys()).toEqual(['1', '<loading>', '2']);

      // Act: response
      ayahs$.next(list(AYAHS));
      ayahs$.complete();

      // Assert
      expect(nodeKeys()).toEqual(['1', '1:1', '1:2', '2']);
      expect(rowFor('1:1').depth).toBe(2);
      expect(rowFor('1').expanded).toBeTrue();
    });

    it('caches a level, so collapsing and reopening makes no new request', () => {
      // Act
      component.onRowPick(rowFor('1'));
      component.onRowPick(rowFor('1'));
      expect(nodeKeys()).toEqual(['1', '2']);
      component.onRowPick(rowFor('1'));

      // Assert
      expect(service.getAyahs).toHaveBeenCalledTimes(1);
      expect(nodeKeys()).toEqual(['1', '1:1', '1:2', '2']);
    });

    it('goes down to words and letters, keeping word timings on the model', () => {
      // Act
      drillToFirstLetter();

      // Assert
      expect(service.getWords).toHaveBeenCalledOnceWith('1:1');
      expect(service.getLetters).toHaveBeenCalledOnceWith('1:1:1');
      expect(rowFor('1:1:1:1').depth).toBe(4);
      expect(rowFor('1:1:1:1').expandable).toBeFalse();
      expect(component.activeKey()).toBe('1:1:1:1');
    });

    it('shows an error row for a level that fails, and retries it', () => {
      // Arrange
      service.getAyahs.and.returnValue(throwError(() => new Error('500')));
      component.onRowPick(rowFor('1'));
      fixture.detectChanges();
      expect(nodeKeys()).toEqual(['1', '<error>', '2']);

      // Act
      service.getAyahs.and.returnValue(of(list(AYAHS)));
      component.retry('1');

      // Assert
      expect(service.getAyahs).toHaveBeenCalledTimes(2);
      expect(nodeKeys()).toEqual(['1', '1:1', '1:2', '2']);
    });

    it('shows an empty row for a level with nothing in it', () => {
      // Arrange
      service.getAyahs.and.returnValue(of(list<HierarchyAyah>([])));

      // Act
      component.onRowPick(rowFor('1'));

      // Assert
      expect(nodeKeys()).toEqual(['1', '<empty>', '2']);
    });
  });

  describe('breadcrumb', () => {
    beforeEach(() => create());

    it('shows the path from the surah down to the active letter', () => {
      // Act
      drillToFirstLetter();

      // Assert
      expect(component.breadcrumb().map((crumb) => [crumb.labelKey, crumb.params])).toEqual([
        ['ADMIN.HIERARCHY.CRUMB_SURAH', { number: 1, name: 'الفاتحة' }],
        ['ADMIN.HIERARCHY.CRUMB_AYAH', { number: 1 }],
        ['ADMIN.HIERARCHY.CRUMB_WORD', { number: 1, text: 'بِسْمِ' }],
        ['ADMIN.HIERARCHY.CRUMB_LETTER', { number: 1, text: 'بِ' }],
      ]);
      const crumbs = el().querySelectorAll('.hierarchy-manager__crumb');
      expect(crumbs.length).toBe(5);
      expect(crumbs[4].querySelector('[aria-current="location"]')).not.toBeNull();
    });

    it('moves back to an ancestor when its crumb is clicked', () => {
      // Arrange
      drillToFirstLetter();

      // Act: crumb buttons are root, surah, ayah, word
      const buttons = el().querySelectorAll<HTMLButtonElement>('.hierarchy-manager__crumb-btn');
      buttons[2].click();
      fixture.detectChanges();

      // Assert
      expect(component.activeKey()).toBe('1:1');
      expect(component.breadcrumb().length).toBe(2);
    });

    it('folds the tree back to the surah list from the root crumb', () => {
      // Arrange
      drillToFirstLetter();

      // Act
      component.onRootCrumb();
      fixture.detectChanges();

      // Assert
      expect(nodeKeys()).toEqual(['1', '2']);
      expect(component.activeKey()).toBe('1');
    });
  });

  describe('keyboard', () => {
    beforeEach(() => create());

    it('activates the first surah when the tree gets focus', () => {
      // Act
      tree().dispatchEvent(new FocusEvent('focus'));
      fixture.detectChanges();

      // Assert
      expect(component.activeKey()).toBe('1');
      expect(tree().getAttribute('aria-activedescendant')).toBe('hierarchy-node-1');
    });

    it('moves with ArrowDown and ArrowUp, stopping at the ends', () => {
      // Act / Assert
      expect(press('ArrowDown')).toBeTrue();
      expect(component.activeKey()).toBe('1');
      press('ArrowDown');
      expect(component.activeKey()).toBe('2');
      press('ArrowDown');
      expect(component.activeKey()).toBe('2');
      press('ArrowUp');
      expect(component.activeKey()).toBe('1');
      press('ArrowUp');
      expect(component.activeKey()).toBe('1');
    });

    it('opens with Enter and walks into the loaded children', () => {
      // Act
      press('ArrowDown');
      expect(press('Enter')).toBeTrue();
      press('ArrowDown');

      // Assert
      expect(service.getAyahs).toHaveBeenCalledOnceWith(1);
      expect(component.activeKey()).toBe('1:1');
      expect(tree().getAttribute('aria-activedescendant')).toBe('hierarchy-node-1-1');
    });

    it('skips placeholder rows when moving', () => {
      // Arrange
      service.getAyahs.and.returnValue(new Subject<HierarchyList<HierarchyAyah>>());
      press('ArrowDown');
      press('Enter');
      expect(nodeKeys()).toEqual(['1', '<loading>', '2']);

      // Act
      press('ArrowDown');

      // Assert
      expect(component.activeKey()).toBe('2');
    });

    it('goes up one level with Escape: to the parent, then collapses it', () => {
      // Arrange
      press('ArrowDown');
      press('Enter');
      press('ArrowDown');
      expect(component.activeKey()).toBe('1:1');

      // Act / Assert: child -> parent
      expect(press('Escape')).toBeTrue();
      expect(component.activeKey()).toBe('1');
      expect(rowFor('1').expanded).toBeTrue();

      // Act / Assert: expanded parent -> collapsed
      expect(press('Escape')).toBeTrue();
      expect(rowFor('1').expanded).toBeFalse();

      // Act / Assert: nothing left to go up to, so the key is left alone
      expect(press('Escape')).toBeFalse();
    });

    it('jumps to the first and last visible node with Home and End', () => {
      press('End');
      expect(component.activeKey()).toBe('2');
      press('Home');
      expect(component.activeKey()).toBe('1');
    });

    it('ignores keys it does not handle', () => {
      expect(press('a')).toBeFalse();
    });
  });

  describe('word rows', () => {
    it('show the word segment timing when present, and say when it is missing', fakeAsync(() => {
      // Arrange
      create();
      tick();

      // Act
      component.onRowPick(rowFor('1'));
      component.onRowPick(rowFor('1:1'));
      fixture.detectChanges();
      tick(100);
      fixture.detectChanges();

      // Assert
      const first = el().querySelector('#hierarchy-node-1-1-1') as HTMLElement;
      const second = el().querySelector('#hierarchy-node-1-1-2') as HTMLElement;
      expect(first.textContent).toContain('ADMIN.HIERARCHY.TIMING');
      expect(first.querySelector('.hierarchy-tree-node__timing')).not.toBeNull();
      expect(second.textContent).toContain('ADMIN.HIERARCHY.NO_TIMING');
    }));
  });

  describe('search', () => {
    let input: HTMLInputElement;

    beforeEach(() => {
      create();
      input = el().querySelector('input[role="combobox"]') as HTMLInputElement;
    });

    function type(value: string): void {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }

    it('waits for typing to pause before searching, showing a loading state', fakeAsync(() => {
      // Act
      type('2:');
      type('1:2');

      // Assert: debounced
      expect(component.searchState()).toBe('loading');
      expect(el().querySelector('.hierarchy-manager__status')).not.toBeNull();
      expect(service.search).not.toHaveBeenCalled();

      // Act
      tick(HIERARCHY_SEARCH_DEBOUNCE_MS);
      fixture.detectChanges();

      // Assert
      expect(service.search).toHaveBeenCalledOnceWith('1:2');
      expect(el().querySelectorAll('[role="option"]').length).toBe(1);
      expect(component.activeResultIndex()).toBe(0);
      expect(tree().closest('[hidden]')).not.toBeNull();
    }));

    it('opens the chosen ayah in the tree with Enter and closes the search', fakeAsync(() => {
      // Arrange
      type('1:2');
      tick(HIERARCHY_SEARCH_DEBOUNCE_MS);
      fixture.detectChanges();

      // Act
      expect(press('Enter', input)).toBeTrue();

      // Assert
      expect(input.value).toBe('');
      expect(component.isSearching()).toBeFalse();
      expect(service.getAyahs).toHaveBeenCalledOnceWith(1);
      expect(rowFor('1').expanded).toBeTrue();
      expect(component.activeKey()).toBe('1:2');
      expect(component.breadcrumb().map((crumb) => crumb.key)).toEqual(['1', '1:2']);
    }));

    it('moves through results with the arrow keys', fakeAsync(() => {
      // Arrange
      service.search.and.returnValue(
        of(
          list<HierarchySearchResult>([
            { ...AYAH_RESULT, ayah_key: '1:1', ayah_number: 1 },
            AYAH_RESULT,
          ])
        )
      );
      type('الله');
      tick(HIERARCHY_SEARCH_DEBOUNCE_MS);
      fixture.detectChanges();

      // Act / Assert
      press('ArrowDown', input);
      expect(component.activeResultIndex()).toBe(1);
      expect(input.getAttribute('aria-activedescendant')).toBe('hierarchy-result-1');
      press('ArrowDown', input);
      expect(component.activeResultIndex()).toBe(1);
      press('ArrowUp', input);
      expect(component.activeResultIndex()).toBe(0);
    }));

    it('clears the search with Escape', fakeAsync(() => {
      // Arrange
      type('baqara');
      tick(HIERARCHY_SEARCH_DEBOUNCE_MS);
      fixture.detectChanges();

      // Act
      expect(press('Escape', input)).toBeTrue();

      // Assert
      expect(input.value).toBe('');
      expect(component.searchState()).toBe('idle');
      expect(tree().closest('[hidden]')).toBeNull();
      expect(press('Escape', input)).toBeFalse();
    }));

    it('shows a no results state', fakeAsync(() => {
      // Arrange
      service.search.and.returnValue(of(list<HierarchySearchResult>([])));

      // Act
      type('zzz');
      tick(HIERARCHY_SEARCH_DEBOUNCE_MS);
      fixture.detectChanges();

      // Assert
      expect(el().textContent).toContain('ADMIN.HIERARCHY.NO_RESULTS');
      expect(el().querySelector('[role="option"]')).toBeNull();
    }));

    it('shows an error state with a retry when the search fails', fakeAsync(() => {
      // Arrange
      service.search.and.returnValue(throwError(() => new Error('500')));
      type('2');
      tick(HIERARCHY_SEARCH_DEBOUNCE_MS);
      fixture.detectChanges();
      expect(el().textContent).toContain('ADMIN.HIERARCHY.SEARCH_ERROR');

      // Act
      service.search.and.returnValue(of(list([AYAH_RESULT])));
      (el().querySelector('app-state-message button') as HTMLButtonElement).click();
      tick(HIERARCHY_SEARCH_DEBOUNCE_MS);
      fixture.detectChanges();

      // Assert
      expect(service.search).toHaveBeenCalledTimes(2);
      expect(el().querySelectorAll('[role="option"]').length).toBe(1);
    }));

    it('moves focus from an empty search box into the tree with ArrowDown', () => {
      // Act
      input.focus();
      press('ArrowDown', input);

      // Assert
      expect(document.activeElement).toBe(tree());
      expect(component.activeKey()).toBe('1');
    });
  });
});
