import { Component, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import type { IFloatingFilterAngularComp } from 'ag-grid-angular';
import type { IFloatingFilterParams, TextFilter } from 'ag-grid-community';

export interface SurahOption {
  value: string;
  label: string;
}

interface SurahFilterParams extends IFloatingFilterParams<TextFilter> {
  /** Returns the current surah options (kept fresh as grid data loads). */
  optionsProvider: () => SurahOption[];
}

/**
 * A dropdown floating filter for the Surah column. Community edition has no Set
 * Filter, so this renders a native `<select>` of the surahs present in the data
 * and drives the column's text filter (equals) from the selection.
 */
@Component({
  selector: 'app-surah-floating-filter',
  standalone: true,
  template: `
    <select
      class="surah-filter"
      [value]="selected()"
      (focus)="refreshOptions()"
      (mousedown)="refreshOptions()"
      (change)="onChange($any($event.target).value)"
    >
      <option value="">{{ 'ADMIN.CONTENT_EDITOR.FILTER_ALL' | translate }}</option>
      @for (opt of options(); track opt.value) {
        <option [value]="opt.value">{{ opt.label }}</option>
      }
    </select>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .surah-filter {
        width: 100%;
        height: 100%;
        min-height: 24px;
        border: 1px solid var(--ag-border-color, #ccc);
        border-radius: 4px;
        background: transparent;
        font: inherit;
        cursor: pointer;
      }
    `,
  ],
  imports: [TranslateModule],
})
export class SurahFloatingFilterComponent implements IFloatingFilterAngularComp {
  private params!: SurahFilterParams;

  readonly selected = signal('');
  readonly options = signal<SurahOption[]>([]);

  agInit(params: SurahFilterParams): void {
    this.params = params;
    this.refreshOptions();
  }

  /** Sync the dropdown when the parent filter model changes elsewhere. */
  onParentModelChanged(model: { filter?: string } | null): void {
    this.selected.set(model?.filter ?? '');
  }

  refreshOptions(): void {
    this.options.set(this.params.optionsProvider?.() ?? []);
  }

  onChange(value: string): void {
    this.selected.set(value);
    this.params.parentFilterInstance((instance) => {
      (instance as TextFilter).onFloatingFilterChanged(value ? 'equals' : null, value || null);
    });
  }
}
