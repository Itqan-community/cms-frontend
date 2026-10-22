import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';
import type { AssetColumn } from '../../models/asset-content.models';
import { AssetContentService } from '../../services/asset-content.service';
import { ManageColumnsModalComponent } from './manage-columns-modal.component';

const TEXT: AssetColumn = {
  key: 'question',
  label_en: 'Question',
  label_ar: '',
  order: 0,
  committed: true,
};
const ANSWER: AssetColumn = {
  key: 'answer',
  label_en: '',
  label_ar: '',
  order: 1,
  committed: false,
};

describe('ManageColumnsModalComponent', () => {
  let service: jasmine.SpyObj<AssetContentService>;

  function create(columns: AssetColumn[] = [TEXT, ANSWER]) {
    const fixture = TestBed.createComponent(ManageColumnsModalComponent);
    fixture.componentRef.setInput('kind', 'tafsir');
    fixture.componentRef.setInput('slug', 'ayah-qa');
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  beforeEach(async () => {
    service = jasmine.createSpyObj<AssetContentService>('AssetContentService', [
      'createColumn',
      'updateColumn',
      'reorderColumns',
      'deleteColumn',
    ]);
    await TestBed.configureTestingModule({
      imports: [ManageColumnsModalComponent, TranslateModule.forRoot()],
      providers: [provideNoopAnimations(), { provide: AssetContentService, useValue: service }],
    }).compileComponents();
  });

  it('freezes the key and hides delete for a committed column', () => {
    // Arrange
    const modal = create();

    // Act / Assert
    expect(modal.canEditKey(TEXT)).toBeFalse();
    expect(modal.canDelete(TEXT)).toBeFalse();
    expect(modal.canEditKey(ANSWER)).toBeTrue();
    expect(modal.canDelete(ANSWER)).toBeTrue();
  });

  it('never offers to delete the only column', () => {
    // Arrange
    const modal = create([ANSWER]);

    // Act / Assert
    expect(modal.canDelete(ANSWER)).toBeFalse();
  });

  it('adds a column and reports the change', () => {
    // Arrange
    const modal = create();
    service.createColumn.and.returnValue(of({ ...ANSWER, key: 'extra' }));
    const changed = jasmine.createSpy('changed');
    modal.changed.subscribe(changed);
    modal.newKey.set('extra');
    modal.newLabelEn.set('Extra');

    // Act
    modal.add();

    // Assert
    expect(service.createColumn).toHaveBeenCalledWith('tafsir', 'ayah-qa', {
      key: 'extra',
      label_en: 'Extra',
      label_ar: '',
    });
    expect(changed).toHaveBeenCalled();
    expect(modal.newKey()).toBe('');
  });

  it('refuses a malformed key before asking the server', () => {
    // Arrange
    const modal = create();
    modal.newKey.set('Bad Key');

    // Act
    modal.add();

    // Assert
    expect(service.createColumn).not.toHaveBeenCalled();
    expect(modal.error()).toBe('ADMIN.CONTENT_EDITOR.COLUMNS_MANAGE.ERRORS.COLUMN_KEY_INVALID');
  });

  it('shows the translated message of a server error', () => {
    // Arrange
    const modal = create();
    TestBed.inject(TranslateService).setTranslation('en', {
      ADMIN: { CONTENT_EDITOR: { COLUMNS_MANAGE: { ERRORS: { COLUMN_KEY_TAKEN: 'Key taken' } } } },
    });
    TestBed.inject(TranslateService).use('en');
    service.createColumn.and.returnValue(
      throwError(
        () => new HttpErrorResponse({ status: 400, error: { error_name: 'column_key_taken' } })
      )
    );
    modal.newKey.set('answer');

    // Act
    modal.add();

    // Assert
    expect(modal.error()).toBe('Key taken');
  });

  it('moves a column down by sending the new order', () => {
    // Arrange
    const modal = create();
    service.reorderColumns.and.returnValue(of([ANSWER, TEXT]));

    // Act
    modal.move(0, 1);

    // Assert
    expect(service.reorderColumns).toHaveBeenCalledWith('tafsir', 'ayah-qa', [
      'answer',
      'question',
    ]);
  });

  it('builds a second quick move on the first one, before the parent reloads', () => {
    // Arrange
    const extra: AssetColumn = { ...ANSWER, key: 'extra', order: 2 };
    const modal = create([TEXT, ANSWER, extra]);
    service.reorderColumns.and.returnValue(of([]));

    // Act — the parent has not passed the new columns in between
    modal.move(0, 1);
    modal.move(1, 1);

    // Assert
    expect(service.reorderColumns.calls.mostRecent().args[2]).toEqual([
      'answer',
      'extra',
      'question',
    ]);
  });

  it('restores the server order when a move fails', () => {
    // Arrange
    const modal = create();
    service.reorderColumns.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: {} }))
    );

    // Act
    modal.move(0, 1);

    // Assert
    expect(modal.rows().map((column) => column.key)).toEqual(['question', 'answer']);
  });

  it('reports a label edit as a labels-only change', () => {
    // Arrange
    const modal = create();
    service.updateColumn.and.returnValue(of({ ...ANSWER, label_en: 'Answer' }));
    const changed = jasmine.createSpy('changed');
    modal.changed.subscribe(changed);

    // Act
    modal.save(ANSWER, 'label_en', 'Answer');

    // Assert
    expect(changed).toHaveBeenCalledWith('labels');
  });

  it('reports a key rename as a structure change', () => {
    // Arrange
    const modal = create();
    service.updateColumn.and.returnValue(of({ ...ANSWER, key: 'reply' }));
    const changed = jasmine.createSpy('changed');
    modal.changed.subscribe(changed);

    // Act
    modal.save(ANSWER, 'key', 'reply');

    // Assert
    expect(changed).toHaveBeenCalledWith('structure');
  });

  it('notes that reordering makes the next version major once a column is committed', () => {
    // Arrange / Act
    const committed = create();

    // Assert
    expect(committed.anyCommitted()).toBeTrue();
  });
});
