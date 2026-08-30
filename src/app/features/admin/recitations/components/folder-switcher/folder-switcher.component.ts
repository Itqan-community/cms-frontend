import {
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
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
 * Browser-tab style switcher for a recitation's folders (variants).
 *
 * Presentational only: it reports intent and the parent owns the API calls and the
 * create/rename modal, so folder state has a single owner.
 */
@Component({
  selector: 'app-folder-switcher',
  standalone: true,
  imports: [
    NgIcon,
    TranslateModule,
    NzButtonModule,
    NzDropDownModule,
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

  /** Tab buttons, in render order, used to move DOM focus for the roving tabindex. */
  private readonly tabButtons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');

  /** Folder whose tab last received keyboard focus; null until the tablist is entered. */
  private readonly focusedFolderSlug = signal<string | null>(null);

  /**
   * The single tab reachable with Tab (roving tabindex): the focused one when it still
   * exists, otherwise the active folder, otherwise the first tab.
   */
  readonly rovingFolderSlug = computed<string | null>(() => {
    const list = this.folders();
    const focused = this.focusedFolderSlug();
    if (focused && list.some((f) => f.slug === focused)) return focused;
    const active = this.activeFolderSlug();
    if (active && list.some((f) => f.slug === active)) return active;
    return list[0]?.slug ?? null;
  });

  folderLabel(folder: RecitationFolderOut): string {
    return folderDisplayName(folder, this.translate.currentLang);
  }

  /** Whether this folder is rendered from added-effects audio, for the tab tag. */
  folderHasFx(folder: RecitationFolderOut): boolean {
    return parseFolderVariant(folder)?.hasFx ?? false;
  }

  /**
   * Whether the variant action is offered for this folder. Locked folders are simply
   * omitted rather than shown disabled: the reason (the slug is already public) is not
   * actionable, so an always-greyed row would be noise.
   */
  canEditVariant(folder: RecitationFolderOut): boolean {
    return this.canRename() && canEditFolderVariant(folder);
  }

  /** Whether the folder's settings menu would have anything in it. */
  hasRowActions(folder: RecitationFolderOut): boolean {
    return this.canEditVariant(folder) || this.canHideFolder(folder) || this.canDelete();
  }

  canHideFolder(folder: RecitationFolderOut): boolean {
    return this.canToggleVisibility() && canToggleFolderVisibility(folder);
  }

  isHidden(folder: RecitationFolderOut): boolean {
    return this.canToggleVisibility() && !isFolderVisible(folder);
  }

  /** Assigning a variant for the first time reads differently from correcting one. */
  variantActionKey(folder: RecitationFolderOut): string {
    return parseFolderVariant(folder)
      ? 'ADMIN.RECITATIONS.FOLDERS.CHANGE_VARIANT'
      : 'ADMIN.RECITATIONS.FOLDERS.SET_VARIANT';
  }

  onSelectTab(folderSlug: string): void {
    this.focusedFolderSlug.set(folderSlug);
    if (folderSlug !== this.activeFolderSlug()) {
      this.folderSelect.emit(folderSlug);
    }
  }

  onTabFocus(folderSlug: string): void {
    this.focusedFolderSlug.set(folderSlug);
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

  private focusTabAt(index: number): void {
    const element = this.tabButtons()[index]?.nativeElement;
    if (!element) return;
    const folder = this.folders()[index];
    if (folder) {
      this.focusedFolderSlug.set(folder.slug);
    }
    element.focus();
  }

  private isRtl(element: HTMLElement | undefined): boolean {
    if (!element) return false;
    return getComputedStyle(element).direction === 'rtl';
  }
}
