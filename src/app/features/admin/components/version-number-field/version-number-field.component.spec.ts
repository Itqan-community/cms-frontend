import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import { VersionNumberFieldComponent } from './version-number-field.component';

describe('VersionNumberFieldComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VersionNumberFieldComponent, TranslateModule.forRoot()],
      providers: [provideNoopAnimations()],
    }).compileComponents();
  });

  function radios(minorDisabled: boolean): HTMLInputElement[] {
    const fixture = TestBed.createComponent(VersionNumberFieldComponent);
    fixture.componentRef.setInput('latest', '1.2');
    fixture.componentRef.setInput('minorDisabled', minorDisabled);
    fixture.detectChanges();
    return Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('input[type=radio]')
    );
  }

  it('disables only the minor option when a major version is required', () => {
    // Arrange / Act
    const [minor, major] = radios(true);

    // Assert
    expect(minor.disabled).toBeTrue();
    expect(major.disabled).toBeFalse();
  });

  it('offers both options otherwise', () => {
    // Arrange / Act
    const [minor, major] = radios(false);

    // Assert
    expect(minor.disabled).toBeFalse();
    expect(major.disabled).toBeFalse();
  });
});
