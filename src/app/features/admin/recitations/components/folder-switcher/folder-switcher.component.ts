import {
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

export interface RecitationFolder {
  id: string;
  name: string;
  isDefault: boolean;
  trackCount: number;
}

@Component({
  selector: 'app-folder-switcher',
  standalone: true,
  imports: [
    FormsModule,
    NgIcon,
    TranslateModule,
    NzButtonModule,
    NzDropDownModule,
    NzInputModule,
    NzModalModule,
    NzToolTipModule,
  ],
  templateUrl: './folder-switcher.component.html',
  styleUrl: './folder-switcher.component.less',
})
export class FolderSwitcherComponent {
  folders = input.required<RecitationFolder[]>();
  activeFolderId = input<string | undefined | null>();
  canManage = input<boolean>(true);

  folderSelect = output<string>();
  setDefault = output<string>();
  createFolder = output<string>();
  renameFolder = output<{ id: string; name: string }>();
  deleteFolder = output<string>();

  readonly isCreateModalVisible = signal(false);
  readonly newFolderName = signal('');

  readonly isRenameModalVisible = signal(false);
  readonly editingFolder = signal<RecitationFolder | null>(null);
  readonly renameFolderName = signal('');

  readonly isDeleteConfirmVisible = signal(false);
  readonly deletingFolder = signal<RecitationFolder | null>(null);

  /** Tab buttons, in render order, used to move DOM focus for the roving tabindex. */
  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  /** Folder whose tab last received keyboard focus; null until the tablist is entered. */
  private readonly focusedFolderId = signal<string | null>(null);

  /**
   * The single tab that is reachable with Tab (roving tabindex): the focused one when it
   * still exists, otherwise the active folder, otherwise the first tab.
   */
  readonly rovingFolderId = computed<string | null>(() => {
    const list = this.folders();
    const focused = this.focusedFolderId();
    if (focused && list.some((f) => f.id === focused)) return focused;
    const active = this.activeFolderId();
    if (active && list.some((f) => f.id === active)) return active;
    return list[0]?.id ?? null;
  });

  onSelectTab(folderId: string): void {
    this.focusedFolderId.set(folderId);
    if (folderId !== this.activeFolderId()) {
      this.folderSelect.emit(folderId);
    }
  }

  onTabFocus(folderId: string): void {
    this.focusedFolderId.set(folderId);
  }

  /**
   * Arrow keys move focus between tabs (wrapping at both ends), Home/End jump to the edges.
   * Activation stays manual — Enter/Space/click — because selecting a folder triggers a
   * request and may be refused while uploads are in flight.
   */
  onTabKeydown(event: KeyboardEvent, index: number): void {
    const buttons = this.tabButtons();
    if (buttons.length === 0) return;

    const rtl = this.isRtl(buttons[index]?.nativeElement);
    const forwardKey = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backwardKey = rtl ? 'ArrowRight' : 'ArrowLeft';

    let targetIndex: number;
    switch (event.key) {
      case forwardKey:
        targetIndex = (index + 1) % buttons.length;
        break;
      case backwardKey:
        targetIndex = (index - 1 + buttons.length) % buttons.length;
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = buttons.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.focusTabAt(targetIndex);
  }

  private focusTabAt(index: number): void {
    const element = this.tabButtons()[index]?.nativeElement;
    if (!element) return;
    const folder = this.folders()[index];
    if (folder) {
      this.focusedFolderId.set(folder.id);
    }
    element.focus();
  }

  private isRtl(element: HTMLElement | undefined): boolean {
    if (!element) return false;
    return getComputedStyle(element).direction === 'rtl';
  }

  onSetDefault(folderId: string): void {
    this.setDefault.emit(folderId);
  }

  openCreateModal(): void {
    this.newFolderName.set('');
    this.isCreateModalVisible.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalVisible.set(false);
    this.newFolderName.set('');
  }

  submitCreate(): void {
    const name = this.newFolderName().trim();
    if (!name) return;
    this.createFolder.emit(name);
    this.closeCreateModal();
  }

  openRenameModal(folder: RecitationFolder): void {
    this.editingFolder.set(folder);
    this.renameFolderName.set(folder.name);
    this.isRenameModalVisible.set(true);
  }

  closeRenameModal(): void {
    this.isRenameModalVisible.set(false);
    this.editingFolder.set(null);
    this.renameFolderName.set('');
  }

  submitRename(): void {
    const folder = this.editingFolder();
    const name = this.renameFolderName().trim();
    if (!folder || !name) return;
    this.renameFolder.emit({ id: folder.id, name });
    this.closeRenameModal();
  }

  confirmDelete(folder: RecitationFolder): void {
    if (this.folders().length <= 1) return;
    this.deletingFolder.set(folder);
    this.isDeleteConfirmVisible.set(true);
  }

  closeDeleteConfirm(): void {
    this.isDeleteConfirmVisible.set(false);
    this.deletingFolder.set(null);
  }

  submitDelete(): void {
    const folder = this.deletingFolder();
    const currentFolders = this.folders();

    if (!folder) return;

    const folderStillExists = currentFolders.some((currentFolder) => currentFolder.id === folder.id);
    const isMinimumFolderCount = currentFolders.length <= 1;

    if (!folderStillExists || isMinimumFolderCount) {
      return;
    }

    this.deleteFolder.emit(folder.id);
    this.closeDeleteConfirm();
  }
}
