import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../../../../environments/environment';
import type { FontPreview } from '../../models/assets.model';
import { AssetFontPreviewComponent } from './asset-font-preview.component';

const PREVIEW: FontPreview = {
  font_url: 'https://storage.example.com/media/previews/fonts/1/abc/hafs.ttf',
  file_name: 'hafs.ttf',
  format: 'truetype',
  sample: [
    { ayah: 1, text: 'بِسۡمِ ٱللَّهِ' },
    { ayah: 2, text: 'ٱلۡحَمۡدُ لِلَّهِ' },
  ],
};

describe('AssetFontPreviewComponent', () => {
  let httpMock: HttpTestingController;
  const url = `${environment.API_BASE_URL}/assets/9/font-preview/`;

  function render(language: string | null) {
    const fixture = TestBed.createComponent(AssetFontPreviewComponent);
    fixture.componentRef.setInput('assetId', 9);
    fixture.componentRef.setInput('language', language);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetFontPreviewComponent, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sets the sample ayahs in the loaded font', fakeAsync(() => {
    // Arrange
    spyOn(FontFace.prototype, 'load').and.callFake(function (this: FontFace) {
      return Promise.resolve(this);
    });
    const fixture = render('ar');

    // Act
    httpMock.expectOne((r) => r.url === url && r.params.get('language') === 'ar').flush(PREVIEW);
    flushMicrotasks();
    fixture.detectChanges();

    // Assert
    const sample = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>(
      '.font-preview__sample'
    );
    expect(sample).not.toBeNull();
    expect(sample!.style.fontFamily).toContain('asset-font-preview-');
    expect(sample!.textContent).toContain('بِسۡمِ ٱللَّهِ ١');
    expect(fixture.nativeElement.textContent).toContain('hafs.ttf');
    fixture.destroy();
  }));

  it('hides the previous language preview while the new language loads', fakeAsync(() => {
    // Arrange
    spyOn(FontFace.prototype, 'load').and.callFake(function (this: FontFace) {
      return Promise.resolve(this);
    });
    const fixture = render('ar');
    httpMock.expectOne((r) => r.params.get('language') === 'ar').flush(PREVIEW);
    flushMicrotasks();
    fixture.detectChanges();

    // Act
    fixture.componentRef.setInput('language', 'en');
    fixture.detectChanges();

    // Assert
    expect((fixture.nativeElement as HTMLElement).querySelector('section')).toBeNull();
    httpMock.expectOne((r) => r.params.get('language') === 'en').flush(PREVIEW);
    flushMicrotasks();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('section')).not.toBeNull();
    fixture.destroy();
  }));

  it('hides itself when the browser cannot load the font', fakeAsync(() => {
    // Arrange
    spyOn(FontFace.prototype, 'load').and.returnValue(Promise.reject(new Error('bad font')));
    spyOn(console, 'warn');
    const fixture = render(null);

    // Act
    httpMock.expectOne(url).flush(PREVIEW);
    flushMicrotasks();
    fixture.detectChanges();

    // Assert
    expect((fixture.nativeElement as HTMLElement).querySelector('section')).toBeNull();
    expect(console.warn).toHaveBeenCalled();
  }));

  it('hides itself when the font has no file to preview', () => {
    // Arrange
    const fixture = render(null);

    // Act
    httpMock
      .expectOne(url)
      .flush({ error_name: 'font_preview_unavailable' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();

    // Assert
    expect((fixture.nativeElement as HTMLElement).querySelector('section')).toBeNull();
  });
});
