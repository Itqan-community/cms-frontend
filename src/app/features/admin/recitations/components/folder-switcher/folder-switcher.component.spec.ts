import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIcons } from '@ng-icons/core';
import {
  lucideEye,
  lucideEyeOff,
  lucideFolder,
  lucidePlus,
  lucideSettings,
  lucideSquarePen,
  lucideTrash2,
} from '@ng-icons/lucide';
import { TranslateModule } from '@ngx-translate/core';
import type { RecitationFolderOut } from '../../models/recitation-folders.models';
import { FolderSwitcherComponent } from './folder-switcher.component';

function makeFolder(overrides: Partial<RecitationFolderOut>): RecitationFolderOut {
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

describe('FolderSwitcherComponent', () => {
  let component: FolderSwitcherComponent;
  let fixture: ComponentFixture<FolderSwitcherComponent>;

  const defaultFolder = makeFolder({});
  const echoFolder = makeFolder({
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
      imports: [FolderSwitcherComponent, TranslateModule.forRoot()],
      providers: [
        provideIcons({
          lucideEye,
          lucideEyeOff,
          lucideFolder,
          lucidePlus,
          lucideSettings,
          lucideSquarePen,
          lucideTrash2,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FolderSwitcherComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('folders', [defaultFolder, echoFolder]);
    fixture.componentRef.setInput('activeFolderSlug', 'default');
    fixture.componentRef.setInput('canCreate', true);
    fixture.componentRef.setInput('canRename', true);
    fixture.componentRef.setInput('canDelete', true);
    fixture.detectChanges();
  });

  it('renders one tab per folder', () => {
    const tabs = fixture.nativeElement.querySelectorAll('.folder-switcher__tab');
    expect(tabs.length).toBe(2);
    expect(tabs[0].textContent).toContain('افتراضي');
    expect(tabs[1].textContent).toContain('مع صدى');
  });

  it('emits folderSelect with the slug when an inactive tab is chosen', () => {
    spyOn(component.folderSelect, 'emit');
    component.onSelectTab('with-echo');
    expect(component.folderSelect.emit).toHaveBeenCalledWith('with-echo');
  });

  it('does not emit folderSelect for the already active tab', () => {
    spyOn(component.folderSelect, 'emit');
    component.onSelectTab('default');
    expect(component.folderSelect.emit).not.toHaveBeenCalled();
  });

  it('keeps exactly one tab in the roving tabindex', () => {
    const reachable = Array.from(
      fixture.nativeElement.querySelectorAll('.folder-switcher__tab-main')
    ).filter((el) => (el as HTMLElement).getAttribute('tabindex') === '0');
    expect(reachable.length).toBe(1);
    expect(component.rovingFolderSlug()).toBe('default');
  });

  it('refuses to delete the default folder', () => {
    spyOn(component.deleteFolder, 'emit');
    component.onDelete(defaultFolder);
    expect(component.deleteFolder.emit).not.toHaveBeenCalled();
  });

  it('emits deleteFolder for a non-default folder', () => {
    spyOn(component.deleteFolder, 'emit');
    component.onDelete(echoFolder);
    expect(component.deleteFolder.emit).toHaveBeenCalledWith(echoFolder);
  });

  it('refuses folder actions the caller lacks permission for', () => {
    fixture.componentRef.setInput('canRename', false);
    fixture.componentRef.setInput('canDelete', false);
    fixture.detectChanges();

    spyOn(component.renameFolder, 'emit');
    spyOn(component.deleteFolder, 'emit');
    component.onRename(echoFolder);
    component.onDelete(echoFolder);

    expect(component.renameFolder.emit).not.toHaveBeenCalled();
    expect(component.deleteFolder.emit).not.toHaveBeenCalled();
    expect(component.hasRowActions(echoFolder)).toBeFalse();
  });

  it('offers the variant action for a free-text folder but never for the default one', () => {
    expect(component.canEditVariant(echoFolder)).toBeTrue();
    expect(component.canEditVariant(defaultFolder)).toBeFalse();
    expect(component.variantActionKey(echoFolder)).toContain('SET_VARIANT');
  });

  it('locks the variant of a classified folder that already holds audio', () => {
    const classified = makeFolder({
      id: 3,
      slug: '320kbps',
      name: '320kbps',
      name_ar: '320 كيلوبت',
      name_en: '320kbps',
      is_default: false,
      tracks_count: 40,
    });
    expect(component.canEditVariant(classified)).toBeFalse();
    expect(component.variantActionKey(classified)).toContain('CHANGE_VARIANT');

    spyOn(component.renameFolder, 'emit');
    component.onRename(classified);
    expect(component.renameFolder.emit).not.toHaveBeenCalled();
  });

  it('hides the visibility action entirely while the backend flag is off', () => {
    expect(component.canToggleVisibility()).toBeFalse();
    expect(component.canHideFolder(echoFolder)).toBeFalse();
    expect(component.isHidden({ ...echoFolder, is_visible: false })).toBeFalse();

    spyOn(component.toggleVisibility, 'emit');
    component.onToggleVisibility(echoFolder);
    expect(component.toggleVisibility.emit).not.toHaveBeenCalled();
  });

  describe('with the visibility flag on', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('canToggleVisibility', true);
      fixture.detectChanges();
    });

    it('treats a folder with no is_visible field as public', () => {
      expect(component.isHidden(echoFolder)).toBeFalse();
      expect(component.isHidden({ ...echoFolder, is_visible: true })).toBeFalse();
      expect(component.isHidden({ ...echoFolder, is_visible: false })).toBeTrue();
    });

    it('refuses to hide the default folder', () => {
      expect(component.canHideFolder(defaultFolder)).toBeFalse();
      expect(component.canHideFolder(echoFolder)).toBeTrue();

      spyOn(component.toggleVisibility, 'emit');
      component.onToggleVisibility(defaultFolder);
      expect(component.toggleVisibility.emit).not.toHaveBeenCalled();

      component.onToggleVisibility(echoFolder);
      expect(component.toggleVisibility.emit).toHaveBeenCalledWith(echoFolder);
    });

    it('marks the tab of a hidden folder', () => {
      fixture.componentRef.setInput('folders', [
        defaultFolder,
        { ...echoFolder, is_visible: false },
      ]);
      fixture.detectChanges();
      const tabs = fixture.nativeElement.querySelectorAll('.folder-switcher__tab');
      expect(tabs[0].classList).not.toContain('folder-switcher__tab--hidden');
      expect(tabs[1].classList).toContain('folder-switcher__tab--hidden');
    });
  });

  it('tags a folder rendered with effects', () => {
    const withFx = makeFolder({
      id: 4,
      slug: '192kbps-with-effects',
      name: '192kbps with effects',
      name_ar: '192 كيلوبت بالمؤثرات',
      name_en: '192kbps with effects',
      is_default: false,
    });
    expect(component.folderHasFx(withFx)).toBeTrue();
    expect(component.folderHasFx(echoFolder)).toBeFalse();
  });
});
