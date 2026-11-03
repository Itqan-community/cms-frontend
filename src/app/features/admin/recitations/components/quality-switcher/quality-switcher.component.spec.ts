import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import {
  lucideEye,
  lucideEyeOff,
  lucideFolder,
  lucidePlus,
  lucideSettings,
  lucideSquarePen,
  lucideStar,
  lucideTrash2,
} from '@ng-icons/lucide';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { TranslateModule } from '@ngx-translate/core';
import type { RecitationQualityOut } from '../../models/recitation-qualities.models';
import { QualitySwitcherComponent } from './quality-switcher.component';

function makeQuality(overrides: Partial<RecitationQualityOut>): RecitationQualityOut {
  return {
    id: 1,
    name: 'افتراضي',
    name_ar: 'افتراضي',
    name_en: 'Default',
    slug: 'default',
    is_default: true,
    tracks_count: 114,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('QualitySwitcherComponent', () => {
  let component: QualitySwitcherComponent;
  let fixture: ComponentFixture<QualitySwitcherComponent>;

  const defaultQuality = makeQuality({});
  const echoQuality = makeQuality({
    id: 2,
    name: 'مع صدى',
    name_ar: 'مع صدى',
    name_en: 'With echo',
    slug: 'with-echo',
    is_default: false,
    tracks_count: 30,
  });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QualitySwitcherComponent, TranslateModule.forRoot()],
      providers: [
        provideNoopAnimations(),
        provideIcons({
          lucideEye,
          lucideEyeOff,
          lucideFolder,
          lucidePlus,
          lucideSettings,
          lucideSquarePen,
          lucideStar,
          lucideTrash2,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QualitySwitcherComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('qualities', [defaultQuality, echoQuality]);
    fixture.componentRef.setInput('activeQualitySlug', 'default');
    fixture.componentRef.setInput('canCreate', true);
    fixture.componentRef.setInput('canRename', true);
    fixture.componentRef.setInput('canDelete', true);
    fixture.detectChanges();
  });

  it('renders one ng-zorro tab per quality', () => {
    const tabs = fixture.nativeElement.querySelectorAll('.ant-tabs-tab');
    expect(tabs.length).toBe(2);
    expect(tabs[0].textContent).toContain('افتراضي');
    expect(tabs[1].textContent).toContain('مع صدى');
  });

  it('derives selectedIndex from activeQualitySlug', () => {
    expect(component.selectedIndex()).toBe(0);
    fixture.componentRef.setInput('activeQualitySlug', 'with-echo');
    fixture.detectChanges();
    expect(component.selectedIndex()).toBe(1);
  });

  it('emits qualitySelect when tab index changes to an inactive quality', () => {
    spyOn(component.qualitySelect, 'emit');
    component.onTabIndexChange(1);
    expect(component.qualitySelect.emit).toHaveBeenCalledWith('with-echo');
  });

  it('does not emit qualitySelect when tab index matches the active quality', () => {
    spyOn(component.qualitySelect, 'emit');
    component.onTabIndexChange(0);
    expect(component.qualitySelect.emit).not.toHaveBeenCalled();
  });

  it('refuses to delete the default quality', () => {
    spyOn(component.deleteQuality, 'emit');
    component.onDelete(defaultQuality);
    expect(component.deleteQuality.emit).not.toHaveBeenCalled();
  });

  it('emits deleteQuality for a non-default quality', () => {
    spyOn(component.deleteQuality, 'emit');
    component.onDelete(echoQuality);
    expect(component.deleteQuality.emit).toHaveBeenCalledWith(echoQuality);
  });

  it('refuses quality actions the caller lacks permission for', () => {
    fixture.componentRef.setInput('canRename', false);
    fixture.componentRef.setInput('canDelete', false);
    fixture.detectChanges();

    spyOn(component.renameQuality, 'emit');
    spyOn(component.deleteQuality, 'emit');
    component.onRename(echoQuality);
    component.onDelete(echoQuality);

    expect(component.renameQuality.emit).not.toHaveBeenCalled();
    expect(component.deleteQuality.emit).not.toHaveBeenCalled();
    expect(component.hasRowActions(echoQuality)).toBeFalse();
  });

  it('offers the variant action for free-text qualities and for the default quality', () => {
    expect(component.canEditVariant(echoQuality)).toBeTrue();
    expect(component.canEditVariant(defaultQuality)).toBeTrue();
    expect(component.variantActionKey(echoQuality)).toContain('SET_VARIANT');
  });

  it('allows editing the default quality even when it holds tracks', () => {
    const busyDefault = makeQuality({ tracks_count: 114 });
    expect(component.canEditVariant(busyDefault)).toBeTrue();

    spyOn(component.renameQuality, 'emit');
    component.onRename(busyDefault);
    expect(component.renameQuality.emit).toHaveBeenCalledWith(busyDefault);
  });

  it('allows editing a classified non-default quality even when it holds audio', () => {
    const classified = makeQuality({
      id: 3,
      slug: '320kbps',
      name: '320kbps',
      name_ar: '320 كيلوبت',
      name_en: '320kbps',
      is_default: false,
      tracks_count: 40,
    });
    expect(component.canEditVariant(classified)).toBeTrue();
    expect(component.variantActionKey(classified)).toContain('CHANGE_VARIANT');

    spyOn(component.renameQuality, 'emit');
    component.onRename(classified);
    expect(component.renameQuality.emit).toHaveBeenCalledWith(classified);
  });

  it('hides the visibility action entirely while the backend flag is off', () => {
    expect(component.canToggleVisibility()).toBeFalse();
    expect(component.canHideQuality(echoQuality)).toBeFalse();
    expect(component.isHidden({ ...echoQuality, is_visible: false })).toBeFalse();

    spyOn(component.toggleVisibility, 'emit');
    component.onToggleVisibility(echoQuality);
    expect(component.toggleVisibility.emit).not.toHaveBeenCalled();
  });

  describe('with the visibility flag on', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('canToggleVisibility', true);
      fixture.detectChanges();
    });

    it('treats a quality with no is_visible field as public', () => {
      expect(component.isHidden(echoQuality)).toBeFalse();
      expect(component.isHidden({ ...echoQuality, is_visible: true })).toBeFalse();
      expect(component.isHidden({ ...echoQuality, is_visible: false })).toBeTrue();
    });

    it('refuses to hide the default quality', () => {
      expect(component.canHideQuality(defaultQuality)).toBeFalse();
      expect(component.canHideQuality(echoQuality)).toBeTrue();

      spyOn(component.toggleVisibility, 'emit');
      component.onToggleVisibility(defaultQuality);
      expect(component.toggleVisibility.emit).not.toHaveBeenCalled();

      component.onToggleVisibility(echoQuality);
      expect(component.toggleVisibility.emit).toHaveBeenCalledWith(echoQuality);
    });

    it('marks the tab title of a hidden quality', () => {
      fixture.componentRef.setInput('qualities', [
        defaultQuality,
        { ...echoQuality, is_visible: false },
      ]);
      fixture.detectChanges();
      const wraps = fixture.nativeElement.querySelectorAll('.quality-switcher__tab-title-wrap');
      expect(wraps[0].classList).not.toContain('quality-switcher__tab-title-wrap--hidden');
      expect(wraps[1].classList).toContain('quality-switcher__tab-title-wrap--hidden');
    });
  });

  describe('with set-default enabled', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('canSetDefault', true);
      fixture.detectChanges();
    });

    it('offers set-default for a visible non-default quality only', () => {
      expect(component.canSetDefaultQuality(echoQuality)).toBeTrue();
      expect(component.canSetDefaultQuality(defaultQuality)).toBeFalse();
      expect(component.canSetDefaultQuality({ ...echoQuality, is_visible: false })).toBeFalse();

      spyOn(component.setDefaultQuality, 'emit');
      component.onSetDefault(echoQuality);
      expect(component.setDefaultQuality.emit).toHaveBeenCalledWith(echoQuality);
      component.onSetDefault(defaultQuality);
      expect(component.setDefaultQuality.emit).toHaveBeenCalledTimes(1);
    });
  });
});
