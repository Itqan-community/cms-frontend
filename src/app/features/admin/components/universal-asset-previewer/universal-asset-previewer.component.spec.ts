import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UniversalAssetPreviewerComponent } from './universal-asset-previewer.component';

describe('UniversalAssetPreviewerComponent', () => {
  let component: UniversalAssetPreviewerComponent;
  let fixture: ComponentFixture<UniversalAssetPreviewerComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UniversalAssetPreviewerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    TestBed.overrideComponent(UniversalAssetPreviewerComponent, {
      set: {
        template: '',
      },
    });

    fixture = TestBed.createComponent(UniversalAssetPreviewerComponent);

    component = fixture.componentInstance;

    httpTestingController = TestBed.inject(HttpTestingController);

    fixture.componentRef.setInput('fileUrl', 'https://example.com/file.txt');

    fixture.componentRef.setInput('fileName', 'file.txt');

    fixture.detectChanges();

    const request = httpTestingController.expectOne('https://example.com/file.txt');

    request.flush('test file content');
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('starts in file preview mode', () => {
    expect(component.previewMode()).toBe('preview');
  });

  it('switches between file preview and diff mode', () => {
    component.setPreviewMode('diff');

    expect(component.previewMode()).toBe('diff');

    component.setPreviewMode('preview');

    expect(component.previewMode()).toBe('preview');
  });

  it('detects text diff data available', () => {
    fixture.componentRef.setInput('originalText', 'line 1');

    fixture.componentRef.setInput('modifiedText', 'line 2');

    fixture.detectChanges();

    expect(component.diffMode()).toBeTrue();
  });

  it('returns matching lines unchanged', () => {
    fixture.componentRef.setInput('originalText', 'line 1\nline 2');

    fixture.componentRef.setInput('modifiedText', 'line 1\nline 2');

    fixture.detectChanges();

    expect(component.diffResult().tooLarge).toBeFalse();

    expect(component.diffResult().lines.map((line) => line.text)).toEqual(['  line 1', '  line 2']);
  });

  it('detects inserted lines', () => {
    fixture.componentRef.setInput('originalText', 'line 1');

    fixture.componentRef.setInput('modifiedText', 'line 1\nline 2');

    fixture.detectChanges();

    expect(component.diffResult().lines.map((line) => line.text)).toEqual(['  line 1', '+ line 2']);
  });

  it('detects removed lines', () => {
    fixture.componentRef.setInput('originalText', 'line 1\nline 2');

    fixture.componentRef.setInput('modifiedText', 'line 1');

    fixture.detectChanges();

    expect(component.diffResult().lines.map((line) => line.text)).toEqual(['  line 1', '- line 2']);
  });

  it('detects modified lines as removal + addition', () => {
    fixture.componentRef.setInput('originalText', 'old line');

    fixture.componentRef.setInput('modifiedText', 'new line');

    fixture.detectChanges();

    expect(component.diffResult().lines.map((line) => line.text)).toEqual([
      '- old line',
      '+ new line',
    ]);
  });

  it('falls back above line limit', () => {
    const largeContent = Array.from({ length: 501 }, (_, index) => `line ${index}`).join('\n');

    fixture.componentRef.setInput('originalText', largeContent);

    fixture.componentRef.setInput('modifiedText', largeContent);

    fixture.detectChanges();

    expect(component.diffResult().tooLarge).toBeTrue();
    expect(component.diffResult().lines).toEqual([]);
  });

  it('falls back above byte limit', () => {
    const largeLine = 'a'.repeat(26 * 1024);

    fixture.componentRef.setInput('originalText', largeLine);

    fixture.componentRef.setInput('modifiedText', largeLine);

    fixture.detectChanges();

    expect(component.diffResult().tooLarge).toBeTrue();
    expect(component.diffResult().lines).toEqual([]);
  });

  it('exposes large-diff state via computed', () => {
    const largeContent = Array.from({ length: 501 }, (_, index) => `line ${index}`).join('\n');

    fixture.componentRef.setInput('originalText', largeContent);

    fixture.componentRef.setInput('modifiedText', largeContent);

    fixture.detectChanges();

    expect(component.diffTooLarge()).toBeTrue();
  });
});
