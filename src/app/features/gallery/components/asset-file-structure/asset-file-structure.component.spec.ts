import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { environment } from '../../../../../environments/environment';
import type { AssetFileStructure } from '../../models/assets.model';
import { AssetFileStructureComponent } from './asset-file-structure.component';

const QA: AssetFileStructure = {
  format: 'csv',
  template: 'ayah',
  header: ['surah', 'ayah', 'question', 'answer'],
  columns: [
    { key: 'question', label_en: 'Question', label_ar: 'السؤال' },
    { key: 'answer', label_en: 'Answer', label_ar: 'الجواب' },
  ],
  rows: [['1', '1', 'Q', 'A']],
};

describe('AssetFileStructureComponent', () => {
  let httpMock: HttpTestingController;
  const url = `${environment.API_BASE_URL}/assets/9/file-structure/`;

  function render(category: string, language: string | null) {
    const fixture = TestBed.createComponent(AssetFileStructureComponent);
    fixture.componentRef.setInput('assetId', 9);
    fixture.componentRef.setInput('category', category);
    fixture.componentRef.setInput('language', language);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetFileStructureComponent, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('shows the header, the column labels and the sample rows', () => {
    // Arrange
    const fixture = render('tafsir', 'ar');

    // Act
    httpMock.expectOne((r) => r.url === url && r.params.get('language') === 'ar').flush(QA);
    fixture.detectChanges();

    // Assert
    const element = fixture.nativeElement as HTMLElement;
    const headers = Array.from(
      element.querySelectorAll('th'),
      (th) => th.textContent?.trim() ?? ''
    );
    expect(headers.length).toBe(4);
    expect(headers[2]).toContain('question');
    expect(headers[2]).toContain('Question');
    expect(element.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('follows the download language', () => {
    // Arrange
    const fixture = render('tafsir', 'ar');
    httpMock.expectOne((r) => r.params.get('language') === 'ar').flush(QA);

    // Act
    fixture.componentRef.setInput('language', 'en');
    fixture.detectChanges();

    // Assert
    httpMock.expectOne((r) => r.url === url && r.params.get('language') === 'en').flush(QA);
  });

  it('hides itself when the language has no file structure', () => {
    // Arrange
    const fixture = render('translation', 'fr');

    // Act
    httpMock
      .expectOne(url + '?language=fr')
      .flush(
        { error_name: 'file_structure_unavailable' },
        { status: 404, statusText: 'Not Found' }
      );
    fixture.detectChanges();

    // Assert
    expect((fixture.nativeElement as HTMLElement).querySelector('.file-structure')).toBeNull();
  });

  it('offers the asset languages above the table and reports the pick', () => {
    // Arrange
    const fixture = render('tafsir', 'ar');
    fixture.componentRef.setInput('languages', ['ar', 'en']);
    httpMock.expectOne((r) => r.params.get('language') === 'ar').flush(QA);
    fixture.detectChanges();
    const picked: (string | null)[] = [];
    fixture.componentInstance.language.subscribe((value) => picked.push(value));

    // Act
    const options = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
      '.file-structure__languages .ant-segmented-item'
    );
    options[1].click();
    fixture.detectChanges();

    // Assert
    expect(options.length).toBe(2);
    expect(picked).toEqual(['en']);
    httpMock.expectOne((r) => r.params.get('language') === 'en').flush(QA);
  });

  it('renames the languages when the interface language changes', () => {
    // Arrange
    const translate = TestBed.inject(TranslateService);
    translate.use('en');
    const fixture = render('tafsir', 'ar');
    fixture.componentRef.setInput('languages', ['ar', 'en']);
    httpMock.expectOne((r) => r.params.get('language') === 'ar').flush(QA);
    fixture.detectChanges();
    const before = fixture.componentInstance.languageOptions()[0].label;

    // Act
    translate.use('ar');
    fixture.detectChanges();

    // Assert
    expect(fixture.componentInstance.languageOptions()[0].label).not.toBe(before);
  });

  it('shows no language switch for a single-language asset', () => {
    // Arrange
    const fixture = render('tafsir', 'ar');
    fixture.componentRef.setInput('languages', ['ar']);

    // Act
    httpMock.expectOne((r) => r.params.get('language') === 'ar').flush(QA);
    fixture.detectChanges();

    // Assert
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.file-structure__languages')
    ).toBeNull();
  });

  it('keeps the previous table, marked busy, while the next language loads', () => {
    // Arrange
    const fixture = render('tafsir', 'ar');
    httpMock.expectOne((r) => r.params.get('language') === 'ar').flush(QA);
    fixture.detectChanges();

    // Act
    fixture.componentRef.setInput('language', 'en');
    fixture.detectChanges();

    // Assert
    const table = (fixture.nativeElement as HTMLElement).querySelector('.file-structure__table');
    expect(table).not.toBeNull();
    expect(table?.getAttribute('aria-busy')).toBe('true');
    httpMock.expectOne((r) => r.params.get('language') === 'en').flush(QA);
    fixture.detectChanges();
    expect(table?.getAttribute('aria-busy')).toBe('false');
  });

  it('asks nothing for categories without text columns', () => {
    // Arrange / Act
    const fixture = render('mushaf', 'ar');

    // Assert
    httpMock.expectNone(() => true);
    expect((fixture.nativeElement as HTMLElement).querySelector('.file-structure')).toBeNull();
  });
});
