import { ComponentFixture, TestBed } from '@angular/core/testing';
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
