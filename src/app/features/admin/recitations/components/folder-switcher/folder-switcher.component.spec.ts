import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { provideIcons } from '@ng-icons/core';
import {
  lucideFolder,
  lucidePlus,
  lucideSettings,
  lucideSquarePen,
  lucideStar,
  lucideTrash2,
} from '@ng-icons/lucide';
import { FolderSwitcherComponent, RecitationFolder } from './folder-switcher.component';

describe('FolderSwitcherComponent', () => {
  let component: FolderSwitcherComponent;
  let fixture: ComponentFixture<FolderSwitcherComponent>;

  const mockFolders: RecitationFolder[] = [
    { id: '1', name: 'Main', isDefault: true, trackCount: 114 },
    { id: '2', name: 'Variant 2', isDefault: false, trackCount: 50 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FolderSwitcherComponent, TranslateModule.forRoot()],
      providers: [
        provideIcons({
          lucideFolder,
          lucidePlus,
          lucideSettings,
          lucideSquarePen,
          lucideStar,
          lucideTrash2,
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(FolderSwitcherComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('folders', mockFolders);
    fixture.componentRef.setInput('activeFolderId', '1');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render folder tabs', () => {
    const tabs = fixture.nativeElement.querySelectorAll('.folder-switcher__tab');
    expect(tabs.length).toBe(2);
    expect(tabs[0].textContent).toContain('Main');
    expect(tabs[1].textContent).toContain('Variant 2');
  });

  it('should emit folderSelect when tab is clicked', () => {
    spyOn(component.folderSelect, 'emit');
    component.onSelectTab('2');
    expect(component.folderSelect.emit).toHaveBeenCalledWith('2');
  });

  it('should emit setDefault when set default action is called', () => {
    spyOn(component.setDefault, 'emit');
    component.onSetDefault('2');
    expect(component.setDefault.emit).toHaveBeenCalledWith('2');
  });

  it('should open and submit create modal', () => {
    spyOn(component.createFolder, 'emit');
    component.openCreateModal();
    expect(component.isCreateModalVisible()).toBeTrue();

    component.newFolderName.set('New Variant');
    component.submitCreate();
    expect(component.createFolder.emit).toHaveBeenCalledWith('New Variant');
    expect(component.isCreateModalVisible()).toBeFalse();
  });

  it('should not emit deleteFolder when the folder is no longer in the current collection', () => {
    spyOn(component.deleteFolder, 'emit');
    component.deletingFolder.set({
      id: 'missing',
      name: 'Missing',
      isDefault: false,
      trackCount: 0,
    });
    component.isDeleteConfirmVisible.set(true);

    component.submitDelete();

    expect(component.deleteFolder.emit).not.toHaveBeenCalled();
    expect(component.isDeleteConfirmVisible()).toBeTrue();
  });

  it('should not emit deleteFolder when the folder list is already at the minimum count', () => {
    spyOn(component.deleteFolder, 'emit');
    component.deletingFolder.set(mockFolders[1]);
    fixture.componentRef.setInput('folders', [mockFolders[1]]);
    component.isDeleteConfirmVisible.set(true);

    component.submitDelete();

    expect(component.deleteFolder.emit).not.toHaveBeenCalled();
    expect(component.isDeleteConfirmVisible()).toBeTrue();
  });
});
