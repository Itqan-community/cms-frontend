import { HttpErrorResponse } from '@angular/common/http';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, of, throwError } from 'rxjs';
import type { QuranRangeResponse } from '../../models/asset-content.models';
import { AssetContentService } from '../../services/asset-content.service';
import { GroupRangeModalComponent } from './group-range-modal.component';

const AYAHS: QuranRangeResponse = {
  units: [
    { surah: 1, ayah: 1, word: null, text: 'a1' },
    { surah: 1, ayah: 2, word: null, text: 'a2' },
  ],
  truncated: false,
};

describe('GroupRangeModalComponent', () => {
  let service: jasmine.SpyObj<AssetContentService>;

  function create(
    template: 'ayah_group' | 'word_group' = 'ayah_group',
    mode: 'add' | 'move' = 'add'
  ) {
    const fixture = TestBed.createComponent(GroupRangeModalComponent);
    fixture.componentRef.setInput('template', template);
    fixture.componentRef.setInput('mode', mode);
    fixture.componentRef.setInput('columnKeys', ['text']);
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    return { fixture, modal: fixture.componentInstance };
  }

  beforeEach(async () => {
    service = jasmine.createSpyObj<AssetContentService>('AssetContentService', ['quranRange']);
    service.quranRange.and.returnValue(of(AYAHS));
    await TestBed.configureTestingModule({
      imports: [GroupRangeModalComponent, TranslateModule.forRoot()],
      providers: [provideNoopAnimations(), { provide: AssetContentService, useValue: service }],
    }).compileComponents();
  });

  it('requests the preview once after the debounce', fakeAsync(() => {
    // Arrange
    const { modal } = create();

    // Act
    modal.setPosition('end', { ayah: 2 });
    tick(300);

    // Assert
    expect(service.quranRange).toHaveBeenCalledTimes(1);
    expect(service.quranRange).toHaveBeenCalledWith({ surah: 1, ayah: 1 }, { surah: 1, ayah: 2 });
    expect(modal.previewText()).toBe('a1 ۝1 a2');
  }));

  it('renders only the newest preview when the range changes quickly', fakeAsync(() => {
    // Arrange
    const slow = new Subject<QuranRangeResponse>();
    service.quranRange.and.returnValues(
      slow,
      of({ units: [{ surah: 1, ayah: 3, word: null, text: 'a3' }], truncated: false })
    );
    const { modal } = create();

    // Act
    modal.setPosition('end', { ayah: 2 });
    tick(300);
    modal.setPosition('end', { ayah: 3 });
    tick(300);
    slow.next(AYAHS);

    // Assert
    expect(modal.previewText()).toBe('a3');
  }));

  it('sends word positions and renders a word range across two ayahs', fakeAsync(() => {
    // Arrange
    service.quranRange.and.returnValue(
      of({
        units: [
          { surah: 2, ayah: 5, word: 3, text: 'w3' },
          { surah: 2, ayah: 5, word: 4, text: 'w4' },
          { surah: 2, ayah: 6, word: 1, text: 'v1' },
          { surah: 2, ayah: 6, word: 2, text: 'v2' },
        ],
        truncated: false,
      })
    );
    const { modal } = create('word_group');

    // Act
    modal.setPosition('start', { surah: 2, ayah: 5, word: 3 });
    modal.setPosition('end', { surah: 2, ayah: 6, word: 2 });
    tick(300);

    // Assert
    expect(service.quranRange).toHaveBeenCalledWith(
      { surah: 2, ayah: 5, word: 3 },
      { surah: 2, ayah: 6, word: 2 }
    );
    expect(modal.previewText()).toBe('w3 w4 ۝5 v1 v2');
  }));

  it('shows the inline error and disables confirm on group_range_invalid', fakeAsync(() => {
    // Arrange
    service.quranRange.and.returnValue(
      throwError(
        () => new HttpErrorResponse({ status: 400, error: { error_name: 'group_range_invalid' } })
      )
    );
    const { modal } = create();
    modal.setText('text', 'commentary');

    // Act
    modal.setPosition('start', { ayah: 3 });
    tick(300);

    // Assert
    expect(modal.previewError()).toBe('ADMIN.CONTENT_EDITOR.ERRORS.GROUP_RANGE_INVALID');
    expect(modal.canConfirm()).toBeFalse();
  }));

  it('disables confirm in add mode while every text is blank', fakeAsync(() => {
    // Arrange
    const { modal } = create();
    tick(300);

    // Act
    modal.setText('text', '   ');

    // Assert
    expect(modal.preview()).not.toBeNull();
    expect(modal.canConfirm()).toBeFalse();
    modal.setText('text', 'commentary');
    expect(modal.canConfirm()).toBeTrue();
  }));

  it('emits start, end and empty cells when confirmed in move mode', fakeAsync(() => {
    // Arrange
    const { fixture, modal } = create('ayah_group', 'move');
    fixture.componentRef.setInput('initialStart', { surah: 1, ayah: 1 });
    fixture.componentRef.setInput('initialEnd', { surah: 1, ayah: 2 });
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    tick(300);
    const emitted: unknown[] = [];
    modal.confirmed.subscribe((value) => emitted.push(value));

    // Act
    modal.confirm();

    // Assert
    expect(emitted).toEqual([
      { start: { surah: 1, ayah: 1 }, end: { surah: 1, ayah: 2 }, cells: {} },
    ]);
  }));

  it("bounds the ayah options to the surah's ayah count", () => {
    // Arrange
    const { modal } = create();

    // Act
    modal.setPosition('start', { surah: 108, ayah: 9 });

    // Assert
    expect(modal.ayahOptions(108)).toEqual([1, 2, 3]);
    expect(modal.start().ayah).toBe(1);
  });

  it('never shows a preview for a range the user has already changed', fakeAsync(() => {
    // Arrange
    const slow = new Subject<QuranRangeResponse>();
    service.quranRange.and.returnValues(slow, of(AYAHS));
    const { modal } = create();
    modal.setPosition('end', { ayah: 2 });
    tick(300);

    // Act — the user picks again; the old answer lands inside the new debounce
    modal.setPosition('end', { ayah: 3 });
    tick(100);
    slow.next(AYAHS);

    // Assert
    expect(modal.preview()).toBeNull();
    expect(modal.canConfirm()).toBeFalse();
    tick(300);
  }));

  it('moves the end along when the start is picked past it, and back', fakeAsync(() => {
    // Arrange
    const { modal } = create();

    // Act
    modal.setPosition('start', { surah: 2, ayah: 5 });

    // Assert
    expect(modal.end()).toEqual({ surah: 2, ayah: 5 });

    // Act — an end before the start pulls the start back
    modal.setPosition('end', { surah: 1, ayah: 2 });

    // Assert
    expect(modal.start()).toEqual({ surah: 1, ayah: 2 });
    tick(300);
  }));

  it('keeps a cleared word blank while typing and waits for a word before previewing', fakeAsync(() => {
    // Arrange
    const { modal } = create('word_group');
    tick(300);
    service.quranRange.calls.reset();

    // Act
    modal.setPosition('end', { word: null });
    tick(300);

    // Assert
    expect(modal.end().word).toBeNull();
    expect(service.quranRange).not.toHaveBeenCalled();
    expect(modal.canConfirm()).toBeFalse();
  }));
});
