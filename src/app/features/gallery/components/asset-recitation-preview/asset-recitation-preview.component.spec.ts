import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { environment } from '../../../../../environments/environment';
import type { RecitationPreview } from '../../models/assets.model';
import { AssetRecitationPreviewComponent } from './asset-recitation-preview.component';

const PREVIEW: RecitationPreview = {
  tracks: [
    {
      surah_number: 1,
      surah_name: 'الفاتحة',
      surah_name_en: 'Al-Fatihah',
      audio_url: 'https://storage.example.com/media/001.mp3',
      duration_ms: 1000,
    },
    {
      surah_number: 2,
      surah_name: 'البقرة',
      surah_name_en: 'Al-Baqarah',
      audio_url: 'https://storage.example.com/media/002.mp3',
      duration_ms: 2000,
    },
  ],
};

describe('AssetRecitationPreviewComponent', () => {
  let httpMock: HttpTestingController;
  const url = `${environment.API_BASE_URL}/assets/9/recitation-preview/`;

  function render() {
    const fixture = TestBed.createComponent(AssetRecitationPreviewComponent);
    fixture.componentRef.setInput('assetId', 9);
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetRecitationPreviewComponent, TranslateModule.forRoot()],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('shows a player per sample track', () => {
    // Arrange
    const fixture = render();

    // Act
    httpMock.expectOne(url).flush(PREVIEW);
    fixture.detectChanges();

    // Assert
    const element = fixture.nativeElement as HTMLElement;
    const audios = element.querySelectorAll('audio');
    expect(audios.length).toBe(2);
    expect(audios[0].getAttribute('src')).toBe(PREVIEW.tracks[0].audio_url);
    expect(audios[0].getAttribute('preload')).toBe('none');
    expect(element.textContent).toContain('Al-Fatihah');
  });

  it('pauses the playing track when another one starts', () => {
    // Arrange
    const fixture = render();
    httpMock.expectOne(url).flush(PREVIEW);
    fixture.detectChanges();
    const [first, second] = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('audio')
    );
    const pause = spyOn(first, 'pause');
    first.dispatchEvent(new Event('play'));

    // Act
    second.dispatchEvent(new Event('play'));

    // Assert
    expect(pause).toHaveBeenCalledTimes(1);
  });

  it('hides itself when the recitation has no tracks to preview', () => {
    // Arrange
    const fixture = render();

    // Act
    httpMock
      .expectOne(url)
      .flush(
        { error_name: 'recitation_preview_unavailable' },
        { status: 404, statusText: 'Not Found' }
      );
    fixture.detectChanges();

    // Assert
    expect((fixture.nativeElement as HTMLElement).querySelector('section')).toBeNull();
  });
});
