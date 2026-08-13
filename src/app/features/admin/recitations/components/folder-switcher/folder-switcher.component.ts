import { Component, input, output, signal } from '@angular/core';
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

  onSelectTab(folderId: string): void {
    if (folderId !== this.activeFolderId()) {
      this.folderSelect.emit(folderId);
    }
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
    if (!folder) return;
    this.deleteFolder.emit(folder.id);
    this.closeDeleteConfirm();
  }
}
