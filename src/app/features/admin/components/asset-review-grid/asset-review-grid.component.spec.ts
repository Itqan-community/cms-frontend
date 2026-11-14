import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import type { ColDef, GridApi } from 'ag-grid-community';
import { NzMessageService } from 'ng-zorro-antd/message';
import { type ModalOptions, NzModalService } from 'ng-zorro-antd/modal';
import { Subject, of, throwError } from 'rxjs';
import { PORTAL_PERMISSIONS } from '../../constants/portal-permission.constants';
import type { ReviewChange, ReviewChangesResponse } from '../../models/asset-review.models';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AssetContentService } from '../../services/asset-content.service';
import { AssetReviewService } from '../../services/asset-review.service';
import { LastActiveLanguageService } from '../../services/last-active-language.service';
import { AssetReviewGridComponent } from './asset-review-grid.component';

describe('AssetReviewGridComponent', () => {
  let component: AssetReviewGridComponent;
  let fixture: ComponentFixture<AssetReviewGridComponent>;
  let reviewServiceSpy: jasmine.SpyObj<AssetReviewService>;
  let contentServiceSpy: jasmine.SpyObj<AssetContentService>;
  let adminAuthSpy: jasmine.SpyObj<AdminAuthService>;
  let lastLanguageSpy: jasmine.SpyObj<LastActiveLanguageService>;
  let messageSpy: jasmine.SpyObj<NzMessageService>;
  let modalConfirm: jasmine.Spy;

  const mockChange: ReviewChange = {
    id: 1,
    unit_type: 'ayah',
    unit_id: 1,
    label: '1:1',
    surah: 1,
    ayah: 1,
    column: 'text',
    column_label_en: '',
    column_label_ar: '',
    change_type: 'modified',
    old_text: 'old text',
    new_text: 'new text',
    baseline_text: 'baseline text',
    commit_ref: 'c123456',
    commit_id: 10,
    edited_by: 'Editor Name',
    review_state: 'unreviewed',
    comment: '',
    reviewed_by: null,
    reviewed_at: null,
  };

  const mockResponse: ReviewChangesResponse = {
    count: 1,
    results: [mockChange],
  };

  beforeEach(async () => {
    reviewServiceSpy = jasmine.createSpyObj('AssetReviewService', [
      'listLanguages',
      'listChanges',
      'listVersions',
      'setState',
      'bulkApprove',
    ]);
    contentServiceSpy = jasmine.createSpyObj('AssetContentService', ['listColumns']);
    contentServiceSpy.listColumns.and.returnValue(of([]));
    adminAuthSpy = jasmine.createSpyObj('AdminAuthService', ['hasPermission']);
    lastLanguageSpy = jasmine.createSpyObj('LastActiveLanguageService', ['get', 'set']);
    messageSpy = jasmine.createSpyObj('NzMessageService', ['success', 'error', 'warning', 'info']);

    adminAuthSpy.hasPermission.and.callFake(
      (perm: string) => perm === PORTAL_PERMISSIONS.PORTAL_REVIEW_CONTENT
    );
    reviewServiceSpy.listLanguages.and.returnValue(of(['en', 'fr']));
    reviewServiceSpy.listChanges.and.returnValue(of(mockResponse));
    reviewServiceSpy.listVersions.and.returnValue(
      of([
        { id: 11, name: 'v2', created_at: '2026-02-01T00:00:00Z' },
        { id: 10, name: 'v1', created_at: '2026-01-01T00:00:00Z' },
      ])
    );
    reviewServiceSpy.setState.and.returnValue(of({ ...mockChange, review_state: 'approved' }));
    lastLanguageSpy.get.and.returnValue(null);

    await TestBed.configureTestingModule({
      imports: [AssetReviewGridComponent, TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        { provide: AssetReviewService, useValue: reviewServiceSpy },
        { provide: AssetContentService, useValue: contentServiceSpy },
        { provide: AdminAuthService, useValue: adminAuthSpy },
        { provide: LastActiveLanguageService, useValue: lastLanguageSpy },
        { provide: NzMessageService, useValue: messageSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AssetReviewGridComponent);
    component = fixture.componentInstance;
    component.kind = 'text';
    component.slug = 'en-sahih';
    // The component's own NzModalService (NzModalModule provides one, shadowing any
    // root stub); the template's <nz-modal>s need the real one, so only confirm is
    // spied: it confirms immediately, as if the user clicked OK.
    modalConfirm = spyOn(fixture.debugElement.injector.get(NzModalService), 'confirm');
    modalConfirm.and.callFake((options?: ModalOptions) => {
      (options?.nzOnOk as (() => void) | undefined)?.();
      return {};
    });
  });

  /** Waits for the grid: it runs outside Angular's zone, so `whenStable` alone
   *  misses its timers (async events, row rendering). */
  async function settle(): Promise<void> {
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 20));
    fixture.detectChanges();
  }

  /** Loads the page and lets the grid render its rows. */
  async function render(): Promise<HTMLElement> {
    fixture.detectChanges();
    await settle();
    return fixture.nativeElement as HTMLElement;
  }

  function gridApi(): GridApi {
    return (component as unknown as { gridApi: GridApi }).gridApi;
  }

  /** The first row's cell in grid column `colId`. */
  function cell(el: HTMLElement, colId: string): HTMLElement {
    return el.querySelector<HTMLElement>(`.ag-cell[col-id="${colId}"]`)!;
  }

  /** Sets the grid's column filters as a reviewer would, and waits for the reload. */
  async function applyFilter(model: Record<string, unknown>): Promise<void> {
    const api = gridApi();
    await api.setColumnFilterModel(Object.keys(model)[0], Object.values(model)[0]);
    api.onFilterChanged();
    await settle();
  }

  it('should create and load languages on init when user has permission', () => {
    fixture.detectChanges();

    expect(adminAuthSpy.hasPermission).toHaveBeenCalledWith(
      PORTAL_PERMISSIONS.PORTAL_REVIEW_CONTENT
    );
    expect(reviewServiceSpy.listLanguages).toHaveBeenCalledWith('text', 'en-sahih');
    expect(component.languages()).toEqual(['en', 'fr']);
    expect(component.selectedLanguage()).toBe('en');
    expect(reviewServiceSpy.listChanges).toHaveBeenCalled();
  });

  it('should restore remembered language from LastActiveLanguageService', () => {
    lastLanguageSpy.get.and.returnValue('fr');

    fixture.detectChanges();

    expect(component.selectedLanguage()).toBe('fr');
    expect(reviewServiceSpy.listChanges).toHaveBeenCalledWith(
      'text',
      'en-sahih',
      'fr',
      1,
      25,
      'unreviewed',
      null,
      {}
    );
  });

  it('should not load languages on init when user lacks permission', () => {
    adminAuthSpy.hasPermission.and.returnValue(false);
    const unauthorizedFixture = TestBed.createComponent(AssetReviewGridComponent);
    const unauthorizedComp = unauthorizedFixture.componentInstance;
    unauthorizedComp.kind = 'text';
    unauthorizedComp.slug = 'en-sahih';

    unauthorizedFixture.detectChanges();

    expect(unauthorizedComp.canReview()).toBe(false);
    expect(reviewServiceSpy.listLanguages).not.toHaveBeenCalled();
  });

  it('should handle listLanguages failure gracefully and flag languagesError', () => {
    reviewServiceSpy.listLanguages.and.returnValue(throwError(() => new Error('API down')));

    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.languagesError()).toBe(true);
    expect(component.languages()).toEqual([]);
  });

  it('should switch language, update lastLanguage, and reload changes on page 1', () => {
    fixture.detectChanges();
    reviewServiceSpy.listChanges.calls.reset();

    component.page.set(3);
    component.onLanguageChange('fr');

    expect(component.selectedLanguage()).toBe('fr');
    expect(lastLanguageSpy.set).toHaveBeenCalledWith('text', 'en-sahih', 'fr');
    expect(component.page()).toBe(1);
    expect(reviewServiceSpy.listChanges).toHaveBeenCalledWith(
      'text',
      'en-sahih',
      'fr',
      1,
      25,
      'unreviewed',
      null,
      {}
    );
  });

  it('should switch filter and reload changes on page 1', () => {
    fixture.detectChanges();
    reviewServiceSpy.listChanges.calls.reset();

    component.page.set(2);
    component.onFilterChange('approved');

    expect(component.stateFilter()).toBe('approved');
    expect(component.page()).toBe(1);
    expect(reviewServiceSpy.listChanges).toHaveBeenCalledWith(
      'text',
      'en-sahih',
      'en',
      1,
      25,
      'approved',
      null,
      {}
    );
  });

  it('should approve a row with approve action tracking', () => {
    fixture.detectChanges();

    component.approve(mockChange);

    expect(reviewServiceSpy.setState).toHaveBeenCalledWith(
      'text',
      'en-sahih',
      mockChange.id,
      'approved',
      undefined
    );
    expect(messageSpy.success).toHaveBeenCalled();
  });

  it('should unreview a row with unreview action tracking', () => {
    fixture.detectChanges();
    reviewServiceSpy.setState.and.returnValue(of({ ...mockChange, review_state: 'unreviewed' }));

    component.unreview(mockChange);

    expect(reviewServiceSpy.setState).toHaveBeenCalledWith(
      'text',
      'en-sahih',
      mockChange.id,
      'unreviewed',
      undefined
    );
  });

  it('should open comment dialog and submit comment with action tracking', () => {
    fixture.detectChanges();
    reviewServiceSpy.setState.and.returnValue(
      of({ ...mockChange, review_state: 'commented', comment: 'Needs fix' })
    );

    component.openComment(mockChange);
    expect(component.commentOpen()).toBe(true);
    expect(component.commentChangeId).toBe(mockChange.id);

    component.commentText.set('Needs fix');
    component.confirmComment();

    expect(reviewServiceSpy.setState).toHaveBeenCalledWith(
      'text',
      'en-sahih',
      mockChange.id,
      'commented',
      'Needs fix'
    );
    expect(component.commentOpen()).toBe(false);
    expect(component.commentChangeId).toBeNull();
  });

  it('should close comment dialog and reset state on closeComment', () => {
    component.openComment(mockChange);
    expect(component.commentOpen()).toBe(true);

    component.closeComment();
    expect(component.commentOpen()).toBe(false);
    expect(component.commentChangeId).toBeNull();
  });

  it('should not submit comment if text is empty', () => {
    component.openComment(mockChange);
    component.commentText.set('   ');
    component.confirmComment();

    expect(reviewServiceSpy.setState).not.toHaveBeenCalled();
  });

  it('should ignore a changes response that a newer reload has superseded', () => {
    const stale$ = new Subject<ReviewChangesResponse>();
    const fresh$ = new Subject<ReviewChangesResponse>();
    reviewServiceSpy.listChanges.and.returnValues(stale$, fresh$);
    fixture.detectChanges(); // ngOnInit → loadLanguages → loadChanges (stale$)

    component.onFilterChange('approved'); // loadChanges (fresh$)
    const approved: ReviewChange = { ...mockChange, id: 2, review_state: 'approved' };
    fresh$.next({ count: 1, results: [approved] });
    stale$.next(mockResponse); // slow earlier request answering late

    expect(component.changes().map((c) => c.id)).toEqual([2]);
    expect(component.loading()).toBeFalse();
  });

  it('should label each row by its template unit, not an ayah reference', async () => {
    const wordChange: ReviewChange = {
      ...mockChange,
      unit_type: 'word',
      unit_id: 4021,
      label: '2:255:4',
    };
    reviewServiceSpy.listChanges.and.returnValue(of({ count: 1, results: [wordChange] }));

    const el = await render();

    expect(cell(el, 'unit_surah').textContent?.trim()).toBe('2:255:4');
  });

  describe('version filter', () => {
    it('lists every change until a version is picked, then only what makes it up', () => {
      // Arrange
      fixture.detectChanges();
      expect(reviewServiceSpy.listVersions).toHaveBeenCalledWith('text', 'en-sahih', 'en');
      expect(component.versions().map((v) => v.name)).toEqual(['v2', 'v1']);
      expect(reviewServiceSpy.listChanges.calls.mostRecent().args[6]).toBeNull();

      // Act
      component.onVersionChange(10);

      // Assert
      expect(reviewServiceSpy.listChanges.calls.mostRecent().args[6]).toBe(10);
      expect(component.selectedVersionName()).toBe('v1');
      expect(component.page()).toBe(1);
    });

    it('opens on the version and language a link asked for', () => {
      // Arrange — e.g. the version list's "pending review" link
      fixture.componentRef.setInput('initialLanguage', 'fr');
      fixture.componentRef.setInput('initialVersion', 11);

      // Act
      fixture.detectChanges();

      // Assert
      expect(component.selectedLanguage()).toBe('fr');
      expect(component.selectedVersion()).toBe(11);
      expect(reviewServiceSpy.listChanges.calls.mostRecent().args.slice(2, 7)).toEqual([
        'fr',
        1,
        25,
        'unreviewed',
        11,
      ]);
    });

    it('drops the version when the language changes', () => {
      // Arrange
      fixture.componentRef.setInput('initialLanguage', 'fr');
      fixture.componentRef.setInput('initialVersion', 11);
      fixture.detectChanges();

      // Act
      component.onLanguageChange('en');

      // Assert
      expect(component.selectedVersion()).toBeNull();
      expect(reviewServiceSpy.listChanges.calls.mostRecent().args[6]).toBeNull();
    });
  });

  describe('change comparison', () => {
    function renderChange(change: ReviewChange): Promise<HTMLElement> {
      reviewServiceSpy.listChanges.and.returnValue(of({ count: 1, results: [change] }));
      return render();
    }

    it('stacks the last-approved text above the new text, highlighting what changed', async () => {
      const el = await renderChange(mockChange);

      expect(el.querySelector('.change-compare--stacked')).not.toBeNull();
      const before = el.querySelector('.change-compare__text--before')!;
      const after = el.querySelector('.change-compare__text--after')!;
      expect(before.textContent).toContain('baseline');
      expect(before.querySelector('.change-compare__word--removed')?.textContent).toBe('baseline');
      expect(after.querySelector('.change-compare__word--added')?.textContent).toBe('new');
    });

    it('compares with the replaced text when the unit was never approved', async () => {
      const el = await renderChange({ ...mockChange, baseline_text: '' });

      expect(el.querySelector('.change-compare__text--before')!.textContent).toContain('old text');
    });

    it('shows a removed unit with its old text before and nothing after', async () => {
      const el = await renderChange({
        ...mockChange,
        change_type: 'removed',
        new_text: '',
        baseline_text: '',
      });

      expect(el.querySelector('.change-compare__text--before')!.textContent).toContain('old text');
      expect(
        el.querySelector('.change-compare__text--after .change-compare__empty')
      ).not.toBeNull();
    });

    it('folds long unchanged text and opens the full text in a popup', async () => {
      const words = (from: number, to: number) =>
        Array.from({ length: to - from }, (_, i) => `w${from + i}`).join(' ');
      const row: ReviewChange = {
        ...mockChange,
        baseline_text: `${words(0, 40)} God ${words(40, 80)}`,
        new_text: `${words(0, 40)} Allah ${words(40, 80)}`,
      };
      const el = await renderChange(row);
      const inlineAfter = el.querySelector('.change-compare__text--after')!;
      expect(inlineAfter.querySelectorAll('.change-compare__gap').length).toBe(2);

      el.querySelector<HTMLButtonElement>('.asset-review-grid__full-text')!.click();
      fixture.detectChanges();

      expect(component.fullTextRow()?.id).toBe(row.id);
      // The row itself stays folded; the popup holds the unfolded text.
      expect(inlineAfter.querySelectorAll('.change-compare__gap').length).toBe(2);
      component.closeFullText();
      expect(component.fullTextRow()).toBeNull();
    });

    it('cuts a whole new text short and offers it in full in the popup', async () => {
      // Arrange — e.g. a newly uploaded language: every unit is a long "added" text
      const longText = Array.from({ length: 400 }, (_, i) => `word${i}`).join(' ');
      const el = await renderChange({
        ...mockChange,
        change_type: 'added',
        old_text: '',
        baseline_text: '',
        new_text: longText,
      });

      // Assert
      const after = el.querySelector('.change-compare__text--after')!;
      expect(after.textContent!.length).toBeLessThan(longText.length / 2);
      expect(after.querySelector('.change-compare__gap')).not.toBeNull();
      expect(el.querySelector('.asset-review-grid__full-text')).not.toBeNull();
    });

    it('offers no full-text popup when nothing is folded', async () => {
      const el = await renderChange(mockChange);

      expect(el.querySelector('.asset-review-grid__full-text')).toBeNull();
    });
  });

  describe('editor column', () => {
    it('names the editor who made each change', async () => {
      const el = await render();

      expect(cell(el, 'edited_by').textContent?.trim()).toBe('Editor Name');
    });

    it('shows a dash when the editor was not recorded', async () => {
      reviewServiceSpy.listChanges.and.returnValue(
        of({ count: 1, results: [{ ...mockChange, edited_by: null }] })
      );

      const el = await render();

      expect(cell(el, 'edited_by').textContent?.trim()).toBe('COMMON.EM_DASH');
    });
  });

  describe('bulk approve', () => {
    const second: ReviewChange = { ...mockChange, id: 2, label: '1:2' };
    const approved: ReviewChange = { ...mockChange, id: 3, label: '1:3', review_state: 'approved' };

    beforeEach(() => {
      reviewServiceSpy.listChanges.and.returnValue(
        of({ count: 3, results: [mockChange, second, approved] })
      );
      reviewServiceSpy.bulkApprove.and.returnValue(of({ approved: 2 }));
    });

    it('selects only the rows that still need approval', async () => {
      await render();

      gridApi().selectAll();
      await settle();

      expect([...component.selectedIds()].sort()).toEqual([1, 2]);
    });

    it('approves the selected rows, then reloads with the selection cleared', () => {
      fixture.detectChanges();
      component.toggleRow(2, true);
      reviewServiceSpy.listChanges.calls.reset();

      component.approveSelected();

      expect(reviewServiceSpy.bulkApprove).toHaveBeenCalledWith('text', 'en-sahih', {
        language: 'en',
        change_ids: [2],
      });
      expect(messageSpy.success).toHaveBeenCalled();
      expect(reviewServiceSpy.listChanges).toHaveBeenCalled();
      expect(component.selectedIds().size).toBe(0);
    });

    it('approves everything the filters match after confirming', () => {
      fixture.detectChanges();
      component.onVersionChange(10);

      component.approveAll();

      expect(modalConfirm).toHaveBeenCalled();
      expect(reviewServiceSpy.bulkApprove).toHaveBeenCalledWith('text', 'en-sahih', {
        language: 'en',
        state: 'unreviewed',
        version: 10,
      });
    });

    it('approves only what the column filters match', async () => {
      await render();
      await applyFilter({ ayah: { filterType: 'number', type: 'equals', filter: 3 } });

      component.approveAll();

      expect(reviewServiceSpy.bulkApprove).toHaveBeenCalledWith('text', 'en-sahih', {
        language: 'en',
        state: 'unreviewed',
        filters: { ayah: { filterType: 'number', type: 'equals', filter: 3 } },
      });
    });

    it('sends no state filter when every state is listed', () => {
      fixture.detectChanges();
      component.onFilterChange('all');

      component.approveAll();

      expect(reviewServiceSpy.bulkApprove).toHaveBeenCalledWith('text', 'en-sahih', {
        language: 'en',
      });
    });

    it('offers no approve-all while only approved changes are listed', () => {
      fixture.detectChanges();
      component.onFilterChange('approved');

      component.approveAll();

      expect(component.canApproveAll()).toBeFalse();
      expect(reviewServiceSpy.bulkApprove).not.toHaveBeenCalled();
    });

    it('drops the selection as soon as another listing is requested', () => {
      fixture.detectChanges();
      component.toggleRow(1, true);
      const pending = new Subject<ReviewChangesResponse>();
      reviewServiceSpy.listChanges.and.returnValue(pending);

      component.onLanguageChange('fr');
      component.approveSelected();

      expect(component.selectedIds().size).toBe(0);
      expect(reviewServiceSpy.bulkApprove).not.toHaveBeenCalled();
    });

    it('keeps the selection when the bulk approve fails', () => {
      reviewServiceSpy.bulkApprove.and.returnValue(
        throwError(() => ({ error: { error_name: 'change_not_found' } }))
      );
      fixture.detectChanges();
      component.toggleRow(1, true);

      component.approveSelected();

      expect(messageSpy.error).toHaveBeenCalled();
      expect(component.bulkApproving()).toBeFalse();
      expect([...component.selectedIds()]).toEqual([1]);
    });
  });

  it('names the column of each change by its label when the asset has several columns', () => {
    // Arrange
    component.changes.set([
      {
        ...mockChange,
        id: 1,
        column: 'question',
        column_label_en: 'Question',
        column_label_ar: 'السؤال',
      },
      { ...mockChange, id: 2, column: 'answer', column_label_en: '', column_label_ar: '' },
    ]);

    // Act / Assert
    expect(component.multiColumn()).toBeTrue();
    expect(component.columnName(component.changes()[0])).toBe('Question');
    expect(component.columnName(component.changes()[1])).toBe('answer');
  });

  it("names columns whenever the asset has several, even if this page's changes are all in one", () => {
    // Arrange
    contentServiceSpy.listColumns.and.returnValue(
      of([
        { key: 'text', label_en: '', label_ar: '', order: 0, committed: true },
        { key: 'answer', label_en: '', label_ar: '', order: 1, committed: false },
      ])
    );

    // Act
    fixture.detectChanges();
    component.changes.set([{ ...mockChange, column: 'text' }]);

    // Assert
    expect(contentServiceSpy.listColumns).toHaveBeenCalledWith('text', 'en-sahih');
    expect(component.multiColumn()).toBeTrue();
  });

  it('names no column for a single-column asset whatever its key', () => {
    // Arrange
    contentServiceSpy.listColumns.and.returnValue(
      of([{ key: 'body', label_en: '', label_ar: '', order: 0, committed: true }])
    );

    // Act
    fixture.detectChanges();
    component.changes.set([{ ...mockChange, column: 'body' }]);

    // Assert
    expect(component.multiColumn()).toBeFalse();
  });

  it('shows no column for a single-column asset', () => {
    // Arrange
    component.changes.set([mockChange]);

    // Act / Assert
    expect(component.multiColumn()).toBeFalse();
  });

  describe('column filters', () => {
    const colIds = (defs: ColDef[]) => defs.map((d) => d.colId ?? d.field);

    it('filters every reviewable field by a backend filter key', async () => {
      await render();

      const filtered = component
        .columnDefs()
        .filter((d) => d.filter)
        .map((d) => d.colId ?? d.field);

      expect(filtered).toEqual([
        'unit_surah',
        'ayah',
        'change_type',
        'text',
        'commit_ref',
        'edited_by',
        'comment',
        'reviewed_by',
      ]);
    });

    it('lists page 1 of what a changed filter matches', async () => {
      await render();
      component.page.set(3);
      reviewServiceSpy.listChanges.calls.reset();

      await applyFilter({ text: { filterType: 'text', type: 'contains', filter: 'nom' } });

      expect(component.page()).toBe(1);
      expect(reviewServiceSpy.listChanges).toHaveBeenCalledOnceWith(
        'text',
        'en-sahih',
        'en',
        1,
        25,
        'unreviewed',
        null,
        { text: { filterType: 'text', type: 'contains', filter: 'nom' } }
      );
      expect(component.hasColumnFilters()).toBeTrue();
    });

    it('keeps every row the server matched, even where the text differs locally', async () => {
      // The server matched "الحمد" in vocalized text, which a plain local match would miss.
      reviewServiceSpy.listChanges.and.returnValue(
        of({ count: 1, results: [{ ...mockChange, new_text: 'الْحَمْدُ لِلَّهِ' }] })
      );
      await render();

      await applyFilter({ text: { filterType: 'text', type: 'contains', filter: 'الحمد' } });

      expect(gridApi().getDisplayedRowCount()).toBe(1);
    });

    it('clears the column filters and lists everything again', async () => {
      await render();
      await applyFilter({ ayah: { filterType: 'number', type: 'equals', filter: 3 } });
      reviewServiceSpy.listChanges.calls.reset();

      component.clearColumnFilters();
      await settle();

      expect(component.hasColumnFilters()).toBeFalse();
      expect(reviewServiceSpy.listChanges.calls.mostRecent().args[7]).toEqual({});
    });

    it('offers a column filter only when the asset has several columns', async () => {
      contentServiceSpy.listColumns.and.returnValue(
        of([
          { key: 'question', label_en: 'Question', label_ar: '', order: 0, committed: true },
          { key: 'answer', label_en: '', label_ar: '', order: 1, committed: false },
        ])
      );
      await render();

      const column = component.columnDefs().find((d) => d.field === 'column');

      expect(column?.floatingFilterComponentParams.options).toEqual([
        { value: 'question', label: 'Question' },
        { value: 'answer', label: 'answer' },
      ]);
    });

    it('has no surah or ayah filter for page units', async () => {
      reviewServiceSpy.listChanges.and.returnValue(
        of({
          count: 1,
          results: [{ ...mockChange, unit_type: 'page', label: 'Page 3', surah: null, ayah: null }],
        })
      );
      await render();

      const defs = component.columnDefs();

      expect(colIds(defs)).not.toContain('ayah');
      expect(defs.find((d) => d.colId === 'unit_surah')?.filter).toBeUndefined();
    });
  });
});
