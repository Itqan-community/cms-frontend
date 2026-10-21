import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
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
      providers: [provideHttpClient(), provideHttpClientTesting()],
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

  it('asks nothing for categories without text columns', () => {
    // Arrange / Act
    const fixture = render('mushaf', 'ar');

    // Assert
    httpMock.expectNone(() => true);
    expect((fixture.nativeElement as HTMLElement).querySelector('.file-structure')).toBeNull();
  });
});
