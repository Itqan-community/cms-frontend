import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import type { ImportColumnMapping, ImportColumnsPreview } from '../../models/asset-versions.models';
import { IMPORT_PREVIEW_BYTES } from '../../services/asset-versions.service';
import { ImportColumnMappingComponent } from './import-column-mapping.component';

const PREVIEW: ImportColumnsPreview = {
  header_row: 1,
  headers: ['chapter', 'verse', 'meaning', 'notes'],
  samples: [['1', '1', 'In the name', '']],
  fields: [
    { key: 'surah', kind: 'unit', label_en: '', label_ar: '' },
    { key: 'ayah', kind: 'unit', label_en: '', label_ar: '' },
    { key: 'text', kind: 'text', label_en: 'Text', label_ar: '' },
  ],
  required: [['surah', 'ayah', 'text']],
  mapping: {},
  complete: false,
  attention_rows: [],
};

describe('ImportColumnMappingComponent', () => {
  let fixture: ComponentFixture<ImportColumnMappingComponent>;
  let component: ImportColumnMappingComponent;
  let httpMock: HttpTestingController;
  let message: { error: jasmine.Spy };
  let mappings: (ImportColumnMapping | null)[];
  let readiness: boolean[];

  const url = (r: { url: string }) => r.url.endsWith('/text-assets/my-asset/import-columns/');

  function pick(content = 'chapter,verse,meaning,notes\n1,1,x,\n'): File {
    const file = new File([content], 'data.csv', { type: 'text/csv' });
    fixture.componentRef.setInput('file', file);
    fixture.detectChanges();
    return file;
  }

  beforeEach(async () => {
    message = { error: jasmine.createSpy('error') };
    await TestBed.configureTestingModule({
      imports: [ImportColumnMappingComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NzMessageService, useValue: message },
      ],
    })
      // The behaviour under test is in the class; skip the modal markup.
      .overrideComponent(ImportColumnMappingComponent, { set: { template: '' } })
      .compileComponents();
    fixture = TestBed.createComponent(ImportColumnMappingComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('slug', 'my-asset');
    httpMock = TestBed.inject(HttpTestingController);
    mappings = [];
    readiness = [];
    component.mappingChange.subscribe((m) => mappings.push(m));
    component.readyChange.subscribe((r) => readiness.push(r));
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('sends only the start of the file to the preview', () => {
    // Arrange
    const big = 'a'.repeat(IMPORT_PREVIEW_BYTES * 2);

    // Act
    pick(big);
    const req = httpMock.expectOne(url);

    // Assert
    const sent = (req.request.body as FormData).get('file') as Blob;
    expect(sent.size).toBe(IMPORT_PREVIEW_BYTES);
    req.flush({ ...PREVIEW, complete: true });
  });

  it('opens the dialog and blocks import when required fields are unmatched', () => {
    // Act
    pick();
    expect(component.ready()).toBeFalse();
    httpMock.expectOne(url).flush({ ...PREVIEW, mapping: { surah: 0 } });
    fixture.detectChanges();

    // Assert
    expect(component.dialogOpen()).toBeTrue();
    expect(component.ready()).toBeFalse();
    expect(component.draft()).toEqual(['surah', null, null, null]);
    expect(component.draftMissing()).toEqual(['ayah', 'text']);
    expect(readiness[readiness.length - 1]).toBeFalse();
  });

  it('emits the mapping and unblocks import once every required field has a column', () => {
    // Arrange
    pick();
    httpMock.expectOne(url).flush(PREVIEW);

    // Act
    component.assign(0, 'surah');
    component.assign(1, 'ayah');
    component.assign(2, 'text');
    component.confirm();
    fixture.detectChanges();

    // Assert
    expect(mappings).toEqual([{ surah: 0, ayah: 1, text: 2 }]);
    expect(component.dialogOpen()).toBeFalse();
    expect(component.ready()).toBeTrue();
    expect(readiness[readiness.length - 1]).toBeTrue();
  });

  it('moves a field to the column it was last assigned to', () => {
    // Arrange
    pick();
    httpMock.expectOne(url).flush(PREVIEW);

    // Act
    component.assign(0, 'text');
    component.assign(2, 'text');

    // Assert
    expect(component.draft()).toEqual([null, null, 'text', null]);
  });

  it('does not confirm an incomplete mapping', () => {
    // Arrange
    pick();
    httpMock.expectOne(url).flush(PREVIEW);
    component.assign(0, 'surah');

    // Act
    component.confirm();

    // Assert
    expect(mappings).toEqual([]);
    expect(component.ready()).toBeFalse();
  });

  it('accepts either required set for word files', () => {
    // Arrange
    pick();
    httpMock.expectOne(url).flush({
      ...PREVIEW,
      fields: [
        { key: 'word_id', kind: 'unit', label_en: '', label_ar: '' },
        ...PREVIEW.fields,
        { key: 'word', kind: 'unit', label_en: '', label_ar: '' },
      ],
      required: [
        ['word_id', 'text'],
        ['surah', 'ayah', 'word', 'text'],
      ],
    });

    // Act
    component.assign(0, 'word_id');
    component.assign(2, 'text');

    // Assert
    expect(component.hasAlternatives()).toBeTrue();
    expect(component.draftComplete()).toBeTrue();
  });

  it('leaves the file headers in charge when they already match', () => {
    // Act
    pick();
    httpMock.expectOne(url).flush({ ...PREVIEW, complete: true });

    // Assert
    expect(component.dialogOpen()).toBeFalse();
    expect(component.ready()).toBeTrue();
    expect(mappings).toEqual([]);
  });

  it("shows the backend's message when the preview fails and does not block", () => {
    // Act
    pick();
    httpMock
      .expectOne(url)
      .flush(
        { error_name: 'content_file_unparseable', message: 'Header row unreadable.' },
        { status: 400, statusText: 'Bad Request' }
      );

    // Assert
    expect(message.error).toHaveBeenCalledWith('Header row unreadable.');
    expect(component.ready()).toBeTrue();
  });

  it('forgets a confirmed mapping when the file is cleared', () => {
    // Arrange
    pick();
    httpMock.expectOne(url).flush(PREVIEW);
    component.assign(0, 'surah');
    component.assign(1, 'ayah');
    component.assign(2, 'text');
    component.confirm();

    // Act
    fixture.componentRef.setInput('file', null);
    fixture.detectChanges();

    // Assert
    expect(mappings[mappings.length - 1]).toBeNull();
    expect(component.preview()).toBeNull();
    expect(component.ready()).toBeTrue();
  });
  it('previews against the template and columns of an asset being created', () => {
    // Arrange
    fixture.componentRef.setInput('slug', null);
    fixture.componentRef.setInput('template', 'ayah');
    fixture.componentRef.setInput('columns', [{ key: 'q', label_en: 'Q', label_ar: '' }]);
    fixture.detectChanges();

    // Act
    pick();
    const req = httpMock.expectOne((r) => r.url.endsWith('/content/text-assets/import-columns/'));

    // Assert
    const body = req.request.body as FormData;
    expect(body.get('template')).toBe('ayah');
    expect(body.get('columns')).toBe('[{"key":"q","label_en":"Q","label_ar":""}]');
    req.flush(PREVIEW);
    expect(component.dialogOpen()).toBeTrue();
  });

  it('re-reads the file when the columns change, without reopening the dialog', () => {
    // Arrange
    fixture.componentRef.setInput('slug', null);
    fixture.componentRef.setInput('template', 'ayah');
    fixture.detectChanges();
    pick();
    httpMock
      .expectOne((r) => r.url.endsWith('/content/text-assets/import-columns/'))
      .flush(PREVIEW);
    component.closeDialog();

    // Act
    fixture.componentRef.setInput('columns', [{ key: 'answer', label_en: '', label_ar: '' }]);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.endsWith('/content/text-assets/import-columns/'))
      .flush(PREVIEW);

    // Assert
    expect(component.dialogOpen()).toBeFalse();
    expect(component.ready()).toBeFalse();
  });

  it('previews the file again with a complete draft and lists the rows it flags', () => {
    // Arrange
    pick();
    httpMock.expectOne(url).flush(PREVIEW);
    component.assign(0, 'surah');
    component.assign(1, 'ayah');
    component.assign(2, 'text');

    // Act
    fixture.detectChanges();
    const req = httpMock.expectOne(url);
    req.flush({ ...PREVIEW, attention_rows: [2, 3] });

    // Assert
    expect((req.request.body as FormData).get('column_mapping')).toBe(
      '{"surah":0,"ayah":1,"text":2}'
    );
    expect(component.draftCheck()?.rows).toEqual([2, 3]);
    component.confirm();
    expect(component.attentionRows()).toEqual([2, 3]);
  });

  it("keeps the confirmed mapping's rows when a later draft is checked and cancelled", () => {
    // Arrange
    pick();
    httpMock.expectOne(url).flush(PREVIEW);
    component.assign(0, 'surah');
    component.assign(1, 'ayah');
    component.assign(2, 'text');
    fixture.detectChanges();
    httpMock.expectOne(url).flush({ ...PREVIEW, attention_rows: [2] });
    component.confirm();

    // Act
    component.openDialog();
    component.assign(3, 'text');
    fixture.detectChanges();
    httpMock.expectOne(url).flush(PREVIEW);
    component.closeDialog();

    // Assert
    expect(component.attentionRows()).toEqual([2]);
  });

  it('forgets the check once the draft changes', () => {
    // Arrange
    pick();
    httpMock.expectOne(url).flush(PREVIEW);
    component.assign(0, 'surah');
    component.assign(1, 'ayah');
    component.assign(2, 'text');
    fixture.detectChanges();
    httpMock.expectOne(url).flush({ ...PREVIEW, attention_rows: [2] });

    // Act
    component.assign(3, 'text');

    // Assert
    expect(component.draftCheck()).toBeNull();
    fixture.detectChanges();
    httpMock.expectOne(url).flush(PREVIEW);
    expect(component.draftCheck()?.rows).toEqual([]);
  });

  it("shows the check's backend message in the dialog, without a toast", () => {
    // Arrange
    pick();
    httpMock.expectOne(url).flush(PREVIEW);
    component.assign(0, 'surah');
    component.assign(1, 'ayah');
    component.assign(2, 'text');

    // Act
    fixture.detectChanges();
    httpMock
      .expectOne(url)
      .flush(
        { error_name: 'content_file_unparseable', message: 'Header must be the first row.' },
        { status: 400, statusText: 'Bad Request' }
      );

    // Assert
    expect(component.draftCheck()?.error).toBe('Header must be the first row.');
    expect(message.error).not.toHaveBeenCalled();
  });

  it("lists the first preview's flagged rows when the headers already match", () => {
    // Act
    pick();
    httpMock.expectOne(url).flush({ ...PREVIEW, complete: true, attention_rows: [4] });

    // Assert
    expect(component.attentionRows()).toEqual([4]);
  });
});
