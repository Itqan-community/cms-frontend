import { Component, DestroyRef, OnInit, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { SURAHS_METADATA, surahLabel } from '../../../models/quran-metadata';
import {
  GLYPH_MAX_LENGTH,
  IssueContextForm,
  IssueContextKind,
} from '../../utils/issue-context.util';

/**
 * The "where is the issue" fields of an issue report, by asset category:
 * surah + ayah (recitation, text), page (mushaf), page and/or glyph (font).
 * Uses the same surah / ayah pickers as the content editor's group range dialog.
 */
@Component({
  selector: 'app-issue-context-fields',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule,
    TranslateModule,
  ],
  templateUrl: './issue-context-fields.component.html',
  styleUrl: './issue-context-fields.component.less',
})
export class IssueContextFieldsComponent implements OnInit {
  readonly kind = input.required<IssueContextKind>();
  readonly form = input.required<IssueContextForm>();
  /** The asset's page count when known (a page-based asset's mushaf layout). */
  readonly maxPage = input<number | null>(null);
  /** Whether the fields are required (shows the markers); the validators themselves are set by
   *  the parent with `setIssueContextRequired`. False only for an older report without a location. */
  readonly required = input(true);

  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly surahs = SURAHS_METADATA;
  readonly glyphMaxLength = GLYPH_MAX_LENGTH;

  ngOnInit(): void {
    const { surah } = this.form().controls;
    this.syncAyah(surah.value);
    surah.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.syncAyah(value));
  }

  /** The ayah picker needs a surah; an ayah past the chosen surah's end is cleared. */
  private syncAyah(surah: number | null): void {
    const ayah = this.form().controls.ayah;
    if (ayah.value != null && (surah == null || ayah.value > this.ayahCount(surah))) {
      ayah.setValue(null);
    }
    if (surah == null) ayah.disable({ emitEvent: false });
    else ayah.enable({ emitEvent: false });
  }

  /** A font report with neither a page nor a glyph, once the user has tried to submit. */
  showPageOrGlyphError(): boolean {
    const form = this.form();
    return form.hasError('pageOrGlyph') && (form.touched || form.dirty);
  }

  surahName(id: number): string {
    return surahLabel(id, this.translate.currentLang === 'ar');
  }

  ayahOptions(surah: number | null): number[] {
    if (surah == null) return [];
    return Array.from({ length: this.ayahCount(surah) }, (_, index) => index + 1);
  }

  private ayahCount(surah: number): number {
    return SURAHS_METADATA[surah - 1]?.ayahs ?? 0;
  }
}
