import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { NzMessageService } from 'ng-zorro-antd/message';
import { CsvTemplateDownloadComponent } from './csv-template-download.component';

describe('CsvTemplateDownloadComponent', () => {
  let fixture: ComponentFixture<CsvTemplateDownloadComponent>;
  let component: CsvTemplateDownloadComponent;
  let httpMock: HttpTestingController;
  let anchor: jasmine.SpyObj<HTMLAnchorElement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CsvTemplateDownloadComponent, TranslateModule.forRoot()],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NzMessageService, useValue: { error: () => void 0 } },
      ],
    })
      // The behaviour under test is in the class; skip the icon/button markup.
      .overrideComponent(CsvTemplateDownloadComponent, { set: { template: '' } })
      .compileComponents();
    fixture = TestBed.createComponent(CsvTemplateDownloadComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('kind', 'tafsir');
    httpMock = TestBed.inject(HttpTestingController);
    anchor = jasmine.createSpyObj<HTMLAnchorElement>('a', ['click']);
    const createElement = document.createElement.bind(document);
    spyOn(document, 'createElement').and.callFake((tag: string) =>
      tag === 'a' ? anchor : createElement(tag)
    );
  });

  afterEach(() => httpMock.verify());

  it('is not ready until a template is chosen, nor for pages without a layout', () => {
    // Assert
    expect(component.ready()).toBeFalse();

    // Act / Assert
    fixture.componentRef.setInput('template', 'page');
    expect(component.ready()).toBeFalse();
    fixture.componentRef.setInput('mushafLayoutId', 2);
    expect(component.ready()).toBeTrue();
  });

  it('downloads the template for a chosen template and layout', () => {
    // Arrange
    fixture.componentRef.setInput('template', 'page');
    fixture.componentRef.setInput('mushafLayoutId', 2);

    // Act
    component.download();
    const req = httpMock.expectOne((r) => r.url.endsWith('/content/tafsirs/csv-template/'));
    req.flush(new Blob(['page,text\n']));

    // Assert
    expect(req.request.params.get('template')).toBe('page');
    expect(req.request.params.get('mushaf_layout_id')).toBe('2');
    expect(anchor.download).toBe('page-template.csv');
    expect(anchor.click).toHaveBeenCalled();
  });

  it("downloads an existing asset's template by slug, named after the asset", () => {
    // Arrange
    fixture.componentRef.setInput('slug', 'tabari');
    fixture.componentRef.setInput('assetName', 'Tafsir Tabari');

    // Act
    component.download();
    httpMock
      .expectOne((r) => r.url.endsWith('/content/tafsirs/tabari/csv-template/'))
      .flush(new Blob(['surah,ayah,text\n']));

    // Assert
    expect(component.ready()).toBeTrue();
    expect(anchor.download).toBe('Tafsir_Tabari-template.csv');
  });
});
