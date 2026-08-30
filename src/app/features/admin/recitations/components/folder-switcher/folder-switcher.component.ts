import { Component, computed, inject, input, output } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import type { RecitationFolderOut } from '../../models/recitation-folders.models';
import {
  canEditFolderVariant,
  canToggleFolderVisibility,
  folderDisplayName,
  isFolderVisible,
  parseFolderVariant,
} from '../../utils/recitation-folder.util';

/**
 * Folder switcher built on ng-zorro tabs for touch-friendly horizontal scroll and
 * consistency with the rest of the admin UI. Presentational only — the parent owns
 * API calls and the create/rename modal.
 */
@Component({
  selector: 'app-folder-switcher',
  standalone: true,
  imports: [
    NgIcon,
    TranslateModule,
    NzButtonModule,
    NzDropDownModule,
    NzTabsModule,
    NzTagModule,
    NzToolTipModule,
  ],
  templateUrl: './folder-switcher.component.html',
  styleUrl: './folder-switcher.component.less',
})
export class FolderSwitcherComponent {
  private readonly translate = inject(TranslateService);

  folders = input.required<RecitationFolderOut[]>();
  activeFolderSlug = input<string | null>(null);
  canCreate = input<boolean>(false);
  canRename = input<boolean>(false);
  canDelete = input<boolean>(false);
  /** Off until the portal API exposes `is_visible`; see `environment.recitationFolderVisibility`. */
  canToggleVisibility = input<boolean>(false);

  folderSelect = output<string>();
  addFolder = output<void>();
  renameFolder = output<RecitationFolderOut>();
  deleteFolder = output<RecitationFolderOut>();
  toggleVisibility = output<RecitationFolderOut>();

  readonly selectedIndex = computed(() => {
    const slug = this.activeFolderSlug();
    const idx = this.folders().findIndex((f) => f.slug === slug);
    return idx >= 0 ? idx : 0;
  });

  folderLabel(folder: RecitationFolderOut): string {
    return folderDisplayName(folder, this.translate.currentLang);
  }

  canEditVariant(folder: RecitationFolderOut): boolean {
    return this.canRename() && canEditFolderVariant(folder);
  }

  hasRowActions(folder: RecitationFolderOut): boolean {
    return this.canEditVariant(folder) || this.canHideFolder(folder) || this.canDelete();
  }

  canHideFolder(folder: RecitationFolderOut): boolean {
    return this.canToggleVisibility() && canToggleFolderVisibility(folder);
  }

  isHidden(folder: RecitationFolderOut): boolean {
    return this.canToggleVisibility() && !isFolderVisible(folder);
  }

  variantActionKey(folder: RecitationFolderOut): string {
    return parseFolderVariant(folder)
      ? 'ADMIN.RECITATIONS.FOLDERS.CHANGE_VARIANT'
      : 'ADMIN.RECITATIONS.FOLDERS.SET_VARIANT';
  }

  onTabIndexChange(index: number): void {
    const folder = this.folders()[index];
    if (!folder || folder.slug === this.activeFolderSlug()) return;
    this.folderSelect.emit(folder.slug);
  }

  onRename(folder: RecitationFolderOut): void {
    if (!this.canEditVariant(folder)) return;
    this.renameFolder.emit(folder);
  }

  onDelete(folder: RecitationFolderOut): void {
    if (!this.canDelete() || folder.is_default) return;
    this.deleteFolder.emit(folder);
  }

  onToggleVisibility(folder: RecitationFolderOut): void {
    if (!this.canHideFolder(folder)) return;
    this.toggleVisibility.emit(folder);
  }
}
