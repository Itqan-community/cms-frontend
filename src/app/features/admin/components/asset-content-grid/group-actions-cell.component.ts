import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TranslatePipe } from '@ngx-translate/core';
import type { ICellRendererAngularComp } from 'ag-grid-angular';
import type { ICellRendererParams } from 'ag-grid-community';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import type { ContentEntry } from '../../models/asset-content.models';

/** What a group row may do: change its range, delete it. */
export interface GroupActions {
  move: boolean;
  remove: boolean;
}

/** What the grid passes to a group row's actions cell. */
export interface GroupActionsCellParams extends ICellRendererParams<ContentEntry> {
  actionsFor: (row: ContentEntry) => GroupActions;
  onMove: (row: ContentEntry) => void;
  onDelete: (row: ContentEntry) => void;
}

/** Change-range and delete buttons of a group row (group templates only). */
@Component({
  selector: 'app-group-actions-cell',
  standalone: true,
  imports: [NgIcon, NzButtonModule, NzToolTipModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = params();
    @if (p && p.data; as row) {
      @let actions = p.actionsFor(row);
      @if (actions.move) {
        <button
          nz-button
          nzType="text"
          nzSize="small"
          type="button"
          nz-tooltip
          [nzTooltipTitle]="'ADMIN.CONTENT_EDITOR.GROUPS.MOVE' | translate"
          [attr.aria-label]="'ADMIN.CONTENT_EDITOR.GROUPS.MOVE' | translate"
          (click)="p.onMove(row)"
        >
          <ng-icon name="lucideSquarePen" />
        </button>
      }
      @if (actions.remove) {
        <button
          nz-button
          nzType="text"
          nzSize="small"
          nzDanger
          type="button"
          nz-tooltip
          [nzTooltipTitle]="'ADMIN.CONTENT_EDITOR.GROUPS.DELETE' | translate"
          [attr.aria-label]="'ADMIN.CONTENT_EDITOR.GROUPS.DELETE' | translate"
          (click)="p.onDelete(row)"
        >
          <ng-icon name="lucideTrash2" />
        </button>
      }
    }
  `,
})
export class GroupActionsCellComponent implements ICellRendererAngularComp {
  readonly params = signal<GroupActionsCellParams | null>(null);

  agInit(params: GroupActionsCellParams): void {
    this.params.set(params);
  }

  refresh(params: GroupActionsCellParams): boolean {
    this.params.set(params);
    return true;
  }
}
