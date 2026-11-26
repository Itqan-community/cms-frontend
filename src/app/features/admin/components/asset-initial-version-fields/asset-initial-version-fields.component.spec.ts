import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { TranslateModule } from '@ngx-translate/core';
import { AssetInitialVersionFieldsComponent } from './asset-initial-version-fields.component';

describe('AssetInitialVersionFieldsComponent column readiness', () => {
  let fixture: ComponentFixture<AssetInitialVersionFieldsComponent>;
  let component: AssetInitialVersionFieldsComponent;
  let readiness: boolean[];

  function pick(file: File | null): void {
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: file ? [file] : [] });
    component.onPickFile({ target: input } as unknown as Event);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssetInitialVersionFieldsComponent, TranslateModule.forRoot()],
    })
      // The behaviour under test is in the class; skip the form markup.
      .overrideComponent(AssetInitialVersionFieldsComponent, { set: { template: '' } })
      .compileComponents();
    fixture = TestBed.createComponent(AssetInitialVersionFieldsComponent);
    component = fixture.componentInstance;
    readiness = [];
    component.columnsReadyChange.subscribe((ready) => readiness.push(ready));
  });

  it('does not unblock when a replacement file is picked', () => {
    // Act
    pick(new File(['a'], 'a.csv'));
    pick(new File(['b'], 'b.csv'));

    // Assert
    expect(readiness).toEqual([]);
    expect(component.versionFile()?.name).toBe('b.csv');
  });

  it('unblocks when the file is cleared', () => {
    // Arrange
    pick(new File(['a'], 'a.csv'));

    // Act
    component.clearFile();

    // Assert
    expect(readiness).toEqual([true]);
  });
});

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, AssetInitialVersionFieldsComponent],
  template: `<form [formGroup]="form"><app-asset-initial-version-fields /></form>`,
})
class HostComponent {
  readonly form = new FormGroup({
    version_name_ar: new FormControl('الإصدار الأول'),
    version_name_en: new FormControl(''),
    version_summary_ar: new FormControl('ملخص'),
    version_summary_en: new FormControl('Kept'),
  });
}

describe('AssetInitialVersionFieldsComponent translate to English', () => {
  let host: HostComponent;
  let component: AssetInitialVersionFieldsComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent, TranslateModule.forRoot()],
    })
      .overrideComponent(AssetInitialVersionFieldsComponent, { set: { template: '' } })
      .compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    host = fixture.componentInstance;
    component = fixture.debugElement.query(By.directive(AssetInitialVersionFieldsComponent))
      .componentInstance as AssetInitialVersionFieldsComponent;
  });

  it("reads the version's name and summary from the create form", () => {
    // Act
    host.form.controls.version_name_en.setValue('First');

    // Assert
    expect(component.typedText()).toEqual({
      label_ar: 'الإصدار الأول',
      label_en: 'First',
      summary_ar: 'ملخص',
      summary_en: 'Kept',
    });
  });

  it('writes the translated English into the form', () => {
    // Act
    component.applyTranslation({ label_en: 'First version' });

    // Assert
    expect(host.form.controls.version_name_en.value).toBe('First version');
    expect(host.form.controls.version_name_en.dirty).toBeTrue();
    expect(host.form.controls.version_summary_en.value).toBe('Kept');
  });
});
