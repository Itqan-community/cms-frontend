import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { of } from 'rxjs';
import type {
  ContentEntry,
  ContentIssue,
  ContentIssueGroup,
} from '../../models/asset-content.models';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AssetContentService } from '../../services/asset-content.service';
import { LastActiveLanguageService } from '../../services/last-active-language.service';
import { AssetContentGridComponent } from './asset-content-grid.component';
import {
  IssueMarkerCellComponent,
  suppressIssueKeys,
  type IssueMarkerCellParams,
} from './issue-marker-cell.component';

function issue(id: number, status: ContentIssue['status'] = 'pending'): ContentIssue {
  return { id, description: `Issue ${id}`, status, created_at: '2026-11-20T10:00:00Z' };
}

function row(partial: Partial<ContentEntry>): ContentEntry {
  return {
    unit_type: 'ayah',
    unit_id: 1,
    label: '1:1',
    reference_text: '',
    surah: 1,
    ayah: 1,
    cells: {},
    text: '',
    order: 1,
    ...partial,
  };
}

const KEY = 'content-grid:show-issues:7';

describe('AssetContentGridComponent issue markers', () => {
  let groups: ContentIssueGroup[];

  function componentFor(template: string) {
    const fixture = TestBed.createComponent(AssetContentGridComponent);
    fixture.componentRef.setInput('kind', 'text');
    fixture.componentRef.setInput('slug', 'demo');
    fixture.componentRef.setInput('template', template);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(async () => {
    groups = [];
    localStorage.removeItem(KEY);
    await TestBed.configureTestingModule({
      imports: [AssetContentGridComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        {
          provide: NzMessageService,
          useValue: { success: () => void 0, error: () => void 0, info: () => void 0 },
        },
        { provide: NzModalService, useValue: { confirm: () => void 0, info: () => void 0 } },
        {
          provide: AdminAuthService,
          useValue: { hasPermission: () => true, currentUser: () => ({ id: '7' }) },
        },
        { provide: LastActiveLanguageService, useValue: { get: () => null, set: () => void 0 } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
      ],
    }).compileComponents();
    const service = TestBed.inject(AssetContentService);
    spyOn(service, 'listIssues').and.callFake(() => of(groups));
    spyOn(service, 'listColumns').and.returnValue(of([]));
    spyOn(service, 'listLanguages').and.returnValue(of([]));
  });

  afterEach(() => localStorage.removeItem(KEY));

  it('puts an ayah issue on the row the backend names', () => {
    // Arrange
    groups = [{ surah: 2, ayah: 255, unit_id: 262, issues: [issue(1), issue(2, 'under_review')] }];
    const grid = componentFor('ayah');

    // Act
    const onRow = grid.issuesFor(row({ unit_id: 262, surah: 2, ayah: 255 }));
    const elsewhere = grid.issuesFor(row({ unit_id: 263, surah: 2, ayah: 256 }));

    // Assert
    expect(onRow.map((i) => i.id)).toEqual([1, 2]);
    expect(elsewhere).toEqual([]);
  });

  it('puts an issue on the group row whose range holds its ayah', () => {
    // Arrange
    groups = [{ surah: 1, ayah: 3, unit_id: null, issues: [issue(5)] }];
    const grid = componentFor('ayah_group');
    const covering = row({
      unit_type: 'ayah_group',
      group_from: { surah: 1, ayah: 2 },
      group_to: { surah: 1, ayah: 4 },
    });
    const before = row({
      unit_type: 'ayah_group',
      group_from: { surah: 1, ayah: 1 },
      group_to: { surah: 1, ayah: 2 },
    });

    // Act / Assert
    expect(grid.issuesFor(covering).map((i) => i.id)).toEqual([5]);
    expect(grid.issuesFor(before)).toEqual([]);
  });

  it('puts an issue on the word group that holds the first word of its ayah', () => {
    // Arrange
    groups = [{ surah: 1, ayah: 2, unit_id: null, issues: [issue(6)] }];
    const grid = componentFor('word_group');
    const endsInAyah = row({
      unit_type: 'word_group',
      group_from: { surah: 1, ayah: 1, word: 3 },
      group_to: { surah: 1, ayah: 2, word: 1 },
    });
    const restOfAyah = row({
      unit_type: 'word_group',
      group_from: { surah: 1, ayah: 2, word: 2 },
      group_to: { surah: 1, ayah: 2, word: 5 },
    });

    // Act / Assert
    expect(grid.issuesFor(endsInAyah).map((i) => i.id)).toEqual([6]);
    expect(grid.issuesFor(restOfAyah)).toEqual([]);
  });

  it('adds the issues column only while there are issues and markers are shown', () => {
    // Arrange
    groups = [{ surah: 1, ayah: 1, unit_id: 1, issues: [issue(1)] }];
    const grid = componentFor('ayah');
    const ids = () => grid.buildColumnDefs().map((col) => col.colId ?? col.field);

    // Act / Assert
    expect(ids()).toContain('issues');
    grid.setShowIssues(false);
    expect(ids()).not.toContain('issues');
    grid.issueGroups.set([]);
    grid.setShowIssues(true);
    expect(ids()).not.toContain('issues');
  });

  it('leaves Enter and Space on the issues column to its marker', () => {
    // Arrange
    groups = [{ surah: 1, ayah: 1, unit_id: 1, issues: [issue(1)] }];

    // Act
    const column = componentFor('ayah')
      .buildColumnDefs()
      .find((col) => col.colId === 'issues');

    // Assert
    expect(column?.suppressKeyboardEvent).toBe(suppressIssueKeys);
  });

  it('remembers hiding the markers per user', () => {
    // Arrange
    groups = [{ surah: 1, ayah: 1, unit_id: 1, issues: [issue(1)] }];
    componentFor('ayah').setShowIssues(false);

    // Act
    const reopened = componentFor('ayah');

    // Assert
    expect(localStorage.getItem(KEY)).toBe('0');
    expect(reopened.showIssues()).toBeFalse();
  });

  it('shows the markers when storage is unavailable', () => {
    // Arrange
    spyOn(Storage.prototype, 'getItem').and.throwError('blocked');
    spyOn(Storage.prototype, 'setItem').and.throwError('blocked');

    // Act
    const grid = componentFor('ayah');
    grid.setShowIssues(false);

    // Assert: on by default, and toggling still works for the page
    expect(grid.showIssues()).toBeFalse();
    expect(componentFor('ayah').showIssues()).toBeTrue();
  });

  it('lists a row’s issues in the dialog', () => {
    // Arrange
    const grid = componentFor('ayah');

    // Act
    grid.openIssues(row({ label: '2:255' }), [issue(9)]);

    // Assert
    expect(grid.issuesDialog()).toEqual({ label: '2:255', issues: [issue(9)] });
    grid.closeIssues();
    expect(grid.issuesDialog()).toBeNull();
  });
});

describe('IssueMarkerCellComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IssueMarkerCellComponent, TranslateModule.forRoot()],
      providers: [provideNoopAnimations()],
    }).compileComponents();
  });

  function render(issues: ContentIssue[]) {
    const fixture = TestBed.createComponent(IssueMarkerCellComponent);
    const onOpen = jasmine.createSpy('onOpen');
    const data = row({});
    const cell = document.createElement('div');
    fixture.componentInstance.agInit({
      data,
      eGridCell: cell,
      issuesFor: () => issues,
      onOpen,
    } as unknown as IssueMarkerCellParams);
    fixture.detectChanges();
    return { el: fixture.nativeElement as HTMLElement, onOpen, data, cell, fixture };
  }

  it('opens the list on Enter or Space in the focused cell', () => {
    for (const key of ['Enter', ' ']) {
      // Arrange
      const { onOpen, data, cell } = render([issue(1)]);
      const event = new KeyboardEvent('keydown', { key, cancelable: true });

      // Act
      cell.dispatchEvent(event);

      // Assert
      expect(onOpen)
        .withContext(key)
        .toHaveBeenCalledOnceWith(data, [issue(1)]);
      expect(event.defaultPrevented).withContext(key).toBeTrue();
    }
  });

  it('ignores other keys, rows without issues, and keys after it is destroyed', () => {
    // Arrange
    const withIssues = render([issue(1)]);
    const empty = render([]);

    // Act
    withIssues.cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    empty.cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    withIssues.fixture.destroy();
    withIssues.cell.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

    // Assert
    expect(withIssues.onOpen).not.toHaveBeenCalled();
    expect(empty.onOpen).not.toHaveBeenCalled();
  });

  it('keeps Enter and Space from the grid on the issues column, outside an editor', () => {
    // Arrange
    const press = (key: string, editing = false) =>
      suppressIssueKeys({ editing, event: new KeyboardEvent('keydown', { key }) } as never);

    // Act / Assert
    expect(press('Enter')).toBeTrue();
    expect(press(' ')).toBeTrue();
    expect(press('Tab')).toBeFalse();
    expect(press('ArrowDown')).toBeFalse();
    expect(press('Enter', true)).toBeFalse();
  });

  it('shows the count and opens the list on click', () => {
    // Arrange
    const { el, onOpen, data } = render([issue(1), issue(2)]);
    const button = el.querySelector('button')!;

    // Act
    button.click();

    // Assert
    expect(button.textContent).toContain('2');
    expect(onOpen).toHaveBeenCalledOnceWith(data, [issue(1), issue(2)]);
  });

  it('shows nothing on a row without issues', () => {
    // Arrange / Act
    const { el } = render([]);

    // Assert
    expect(el.querySelector('button')).toBeNull();
  });
});
