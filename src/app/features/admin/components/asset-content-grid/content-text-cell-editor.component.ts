import { Component, ElementRef, viewChild } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { ICellEditorAngularComp } from 'ag-grid-angular';
import type { ICellEditorParams } from 'ag-grid-community';
import { NzButtonModule } from 'ng-zorro-antd/button';
import type { ContentEntry } from '../../models/asset-content.models';

/** Extra `cellEditorParams` this editor reads. */
export interface ContentTextEditorParams {
  /** Show the cell's full text without letting it change (read-only columns). */
  readOnly?: boolean;
  /** Heading over the unit's source-language text, shown while editing a translation. */
  sourceTitle?: string;
}

type Params = ICellEditorParams<ContentEntry, string> & ContentTextEditorParams;

/** Keys the textarea keeps for itself instead of letting the grid navigate. */
const TEXTAREA_KEYS = new Set(['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown']);

/**
 * Popup editor for the unit text column. Unit text can run to thousands of
 * characters, so it opens near-fullscreen (sized by the grid's stylesheet)
 * with the unit's label and Quran text above the textarea for context.
 * Keys follow agLargeTextCellEditor: Enter commits, Shift+Enter is a new
 * line, Esc cancels, and clicking outside commits (the grid's
 * `stopEditingWhenCellsLoseFocus` makes popup editors modal).
 *
 * When editing a translation, the source-language text is shown between the
 * Quran text and the textarea. With `readOnly` it only displays the cell (the
 * source column has no other way to show text longer than one line): the
 * textarea can't change, the only button closes, and the edit always cancels.
 */
@Component({
  selector: 'app-content-text-cell-editor',
  standalone: true,
  template: `
    <div class="text-editor">
      <header class="text-editor__header">
        <span class="text-editor__label">{{ label }}</span>
        @if (reference) {
          <p class="text-editor__reference" dir="rtl">{{ reference }}</p>
        }
      </header>
      @if (source) {
        <section class="text-editor__source">
          <span class="text-editor__source-title">{{ sourceTitle }}</span>
          <p class="text-editor__source-text" dir="auto">{{ source }}</p>
        </section>
      }
      <textarea
        #input
        class="text-editor__input"
        dir="auto"
        [readOnly]="readOnly"
        [value]="value"
        (input)="value = $any($event.target).value"
        (keydown)="onKeydown($event)"
      ></textarea>
      <footer class="text-editor__footer">
        @if (readOnly) {
          <button nz-button nzType="primary" type="button" (click)="cancel()">
            {{ 'ADMIN.CONTENT_EDITOR.TEXT_EDITOR.CLOSE' | translate }}
          </button>
        } @else {
          <span class="text-editor__hint">{{
            'ADMIN.CONTENT_EDITOR.TEXT_EDITOR.HINT' | translate
          }}</span>
          <button nz-button nzType="default" type="button" (click)="cancel()">
            {{ 'ADMIN.CONTENT_EDITOR.TEXT_EDITOR.CANCEL' | translate }}
          </button>
          <button nz-button nzType="primary" type="button" (click)="done()">
            {{ 'ADMIN.CONTENT_EDITOR.TEXT_EDITOR.DONE' | translate }}
          </button>
        }
      </footer>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      .text-editor {
        display: flex;
        flex-direction: column;
        gap: 12px;
        height: 100%;
        padding: 16px;
        background: var(--ag-background-color, #fff);
        border-radius: 8px;
      }
      .text-editor__header {
        flex: none;
        max-height: 25%;
        overflow-y: auto;
        user-select: text;
      }
      .text-editor__label {
        font-weight: 600;
        color: rgba(0, 0, 0, 0.55);
      }
      .text-editor__reference {
        margin: 6px 0 0;
        font-family: serif;
        font-size: 22px;
        line-height: 1.9;
      }
      .text-editor__source {
        flex: none;
        max-height: 30%;
        overflow-y: auto;
        padding: 10px 12px;
        border-radius: 6px;
        background: rgba(0, 0, 0, 0.03);
        user-select: text;
      }
      .text-editor__source-title {
        font-size: 12px;
        font-weight: 600;
        color: rgba(0, 0, 0, 0.55);
      }
      .text-editor__source-text {
        margin: 4px 0 0;
        font-size: 15px;
        line-height: 1.7;
        white-space: pre-wrap;
      }
      .text-editor__input {
        flex: 1;
        width: 100%;
        min-height: 0;
        padding: 12px;
        border: 1px solid var(--ag-border-color, #d9d9d9);
        border-radius: 6px;
        resize: none;
        font: inherit;
        font-size: 16px;
        line-height: 1.7;
      }
      .text-editor__input[readonly] {
        background: rgba(0, 0, 0, 0.02);
      }
      .text-editor__footer {
        flex: none;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
      }
      .text-editor__hint {
        margin-inline-end: auto;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.45);
      }
    `,
  ],
  imports: [TranslateModule, NzButtonModule],
})
export class ContentTextCellEditorComponent implements ICellEditorAngularComp {
  private readonly input = viewChild.required<ElementRef<HTMLTextAreaElement>>('input');
  private params!: Params;

  label = '';
  reference = '';
  source = '';
  sourceTitle = '';
  readOnly = false;
  value = '';
  private cancelled = false;

  agInit(params: Params): void {
    this.params = params;
    this.label = params.data?.label ?? '';
    this.reference = params.data?.reference_text ?? '';
    this.readOnly = params.readOnly ?? false;
    if (this.readOnly) {
      // Read-only: always the cell as-is, whichever key opened it.
      this.value = params.value ?? '';
      this.cancelled = true;
      return;
    }
    this.source = params.data?.source_text ?? '';
    this.sourceTitle = params.sourceTitle ?? '';
    // Same start value as agLargeTextCellEditor: Backspace/Delete clears,
    // a printable key replaces the text, anything else keeps the cell value.
    const { eventKey } = params;
    if (eventKey === 'Backspace' || eventKey === 'Delete') {
      this.value = '';
    } else if (eventKey?.length === 1) {
      this.value = eventKey;
    } else {
      this.value = params.value ?? '';
    }
  }

  getValue(): string {
    return this.value;
  }

  isPopup(): boolean {
    return true;
  }

  /** Read by the grid when editing stops; true discards the edit. */
  isCancelAfterEnd(): boolean {
    return this.cancelled;
  }

  afterGuiAttached(): void {
    const textarea = this.input().nativeElement;
    textarea.focus();
    // Start at the top of long text unless the edit began by typing.
    const typed = !this.readOnly && this.params.eventKey?.length === 1;
    const caret = typed ? textarea.value.length : 0;
    textarea.setSelectionRange(caret, caret);
    textarea.scrollTop = 0;
  }

  onKeydown(event: KeyboardEvent): void {
    if (TEXTAREA_KEYS.has(event.key) || (event.shiftKey && event.key === 'Enter')) {
      event.stopPropagation();
    }
  }

  done(): void {
    this.params.stopEditing();
  }

  cancel(): void {
    // `stopEditing(true)` only suppresses navigation; cancelling goes
    // through `isCancelAfterEnd`.
    this.cancelled = true;
    this.params.stopEditing();
  }
}
