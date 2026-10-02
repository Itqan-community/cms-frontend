import { Component, computed, inject, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { IFloatingFilterAngularComp } from 'ag-grid-angular';
import type { IFloatingFilterParams, NumberFilter } from 'ag-grid-community';
import { SURAHS_METADATA } from '../../models/quran-metadata';

/**
 * A dropdown floating filter for the Surah number column. Community edition
 * has no Set Filter, so this renders a native `<select>` of all 114 surahs
 * (the grid only holds the loaded blocks, so the list can't come from the
 * rows) and drives the column's number filter (equals) from the selection.
 */
@Component({
  selector: 'app-surah-floating-filter',
  standalone: true,
  template: `
    <select
      class="surah-filter"
      [value]="selected()"
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
  private readonly translate = inject(TranslateService);
  private params!: IFloatingFilterParams<NumberFilter>;

  readonly selected = signal('');
  readonly options = computed(() => {
    const arabic = this.translate.currentLang === 'ar';
    return SURAHS_METADATA.map((s) => ({
      value: String(s.id),
      label: `${s.id}. ${arabic ? s.name_ar : s.name_en}`,
    }));
  });

  agInit(params: IFloatingFilterParams<NumberFilter>): void {
    this.params = params;
  }

  /** Sync the dropdown when the parent filter model changes elsewhere. */
  onParentModelChanged(model: { filter?: number | null } | null): void {
    this.selected.set(model?.filter != null ? String(model.filter) : '');
  }

  onChange(value: string): void {
    this.selected.set(value);
    this.params.parentFilterInstance((instance) => {
      instance.onFloatingFilterChanged(value ? 'equals' : null, value ? Number(value) : null);
    });
  }
}
