import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import {
  createIssueContextForm,
  IssueContextForm,
  IssueContextKind,
} from '../../utils/issue-context.util';
import { IssueContextFieldsComponent } from './issue-context-fields.component';

describe('IssueContextFieldsComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [IssueContextFieldsComponent, NoopAnimationsModule, TranslateModule.forRoot()],
    });
  });

  function render(kind: IssueContextKind, form: IssueContextForm = createIssueContextForm()) {
    const fixture = TestBed.createComponent(IssueContextFieldsComponent);
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('form', form);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    return { fixture, form, element };
  }

  it('shows surah and ayah pickers for a recitation or text asset', () => {
    // Act
    const { element } = render('ayah');

    // Assert
    expect(element.querySelector('.issue-context__surah')).not.toBeNull();
    expect(element.querySelector('.issue-context__ayah')).not.toBeNull();
    expect(element.querySelector('.issue-context__page')).toBeNull();
  });

  it('shows a page field for a mushaf, and page and glyph for a font', () => {
    // Act
    const mushaf = render('page').element;
    const font = render('font').element;

    // Assert
    expect(mushaf.querySelector('.issue-context__page')).not.toBeNull();
    expect(mushaf.querySelector('.issue-context__glyph')).toBeNull();
    expect(font.querySelector('.issue-context__page')).not.toBeNull();
    expect(font.querySelector('.issue-context__glyph')).not.toBeNull();
  });

  it('needs a surah before an ayah and clears an ayah past the new surah', () => {
    // Arrange
    const { form } = render('ayah');
    expect(form.controls.ayah.disabled).toBeTrue();

    // Act
    form.controls.surah.setValue(2);
    form.controls.ayah.setValue(255);
    form.controls.surah.setValue(1);

    // Assert
    expect(form.controls.ayah.enabled).toBeTrue();
    expect(form.controls.ayah.value).toBeNull();
  });

  it('lists as many ayahs as the surah has', () => {
    // Act
    const { fixture } = render('ayah');

    // Assert
    expect(fixture.componentInstance.ayahOptions(1).length).toBe(7);
    expect(fixture.componentInstance.ayahOptions(null)).toEqual([]);
  });
});
