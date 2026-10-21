import { ChangeDetectionStrategy, Component, ElementRef, signal, viewChild } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import type { IHeaderAngularComp } from 'ag-grid-angular';
import type { IHeaderParams } from 'ag-grid-community';

/** What the grid passes to a text column's header. */
export interface ContentColumnHeaderParams extends IHeaderParams {
  /** The column's key (CSV header), shown beside its label. */
  columnKey: string;
  /** The user may manage the asset's columns: show the gear. */
  canManage: boolean;
  /** Open the manage-columns dialog on this column. */
  openManage: (key: string) => void;
}

/**
 * Header of a text column: its label, its key in a muted style (when it differs)
 * and, for users allowed to manage columns, a gear opening the columns dialog.
 * Filtering stays on the floating filter row, as for every other column.
 */
@Component({
  selector: 'app-content-column-header',
  standalone: true,
  imports: [NgIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="content-col-header" [attr.title]="params()?.columnKey">
      <span class="content-col-header__label">{{ params()?.displayName }}</span>
      @if (params()?.columnKey !== params()?.displayName) {
        <span class="content-col-header__key">{{ params()?.columnKey }}</span>
      }
      @if (params()?.enableMenu) {
        <button
          #menuButton
          type="button"
          class="content-col-header__menu"
          (click)="showMenu($event)"
        >
          <ng-icon name="lucideMenu" />
        </button>
      }
      @if (params()?.canManage) {
        <button type="button" class="content-col-header__manage" (click)="manage($event)">
          <ng-icon name="lucideSettings" />
        </button>
      }
    </span>
  `,
  styles: `
    .content-col-header {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .content-col-header__label {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .content-col-header__key {
      opacity: 0.55;
      font-size: 0.85em;
      font-family: monospace;
    }
    .content-col-header__manage,
    .content-col-header__menu {
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
      display: inline-flex;
      color: inherit;
      opacity: 0.7;
    }
    .content-col-header__manage:hover,
    .content-col-header__menu:hover {
      opacity: 1;
    }
  `,
})
export class ContentColumnHeaderComponent implements IHeaderAngularComp {
  readonly params = signal<ContentColumnHeaderParams | null>(null);
  private readonly menuButton = viewChild<ElementRef<HTMLButtonElement>>('menuButton');

  agInit(params: ContentColumnHeaderParams): void {
    this.params.set(params);
  }

  refresh(params: ContentColumnHeaderParams): boolean {
    this.params.set(params);
    return true;
  }

  manage(event: MouseEvent): void {
    event.stopPropagation();
    const params = this.params();
    params?.openManage(params.columnKey);
  }

  showMenu(event: MouseEvent): void {
    event.stopPropagation();
    const button = this.menuButton()?.nativeElement;
    if (button) this.params()?.showColumnMenu(button);
  }
}
