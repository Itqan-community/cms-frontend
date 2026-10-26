import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { Subject, catchError, map, of, switchMap, timer } from 'rxjs';
import type {
  AssetTemplate,
  QuranPosition,
  QuranRangeResponse,
} from '../../models/asset-content.models';
import { SURAHS_METADATA, surahLabel } from '../../models/quran-metadata';
import { AssetContentService } from '../../services/asset-content.service';

/** Wait this long after the last range change before previewing it. */
const PREVIEW_DEBOUNCE_MS = 300;
/** Separates the ayahs of a preview, followed by the ending ayah's number. */
const AYAH_END = '۝';

/** Order of two mushaf positions (a missing word counts as before word 1). */
function comparePositions(a: QuranPosition, b: QuranPosition): number {
  return a.surah - b.surah || a.ayah - b.ayah || (a.word ?? 0) - (b.word ?? 0);
}

/** What a confirmed dialog hands back: the range, and in add mode the first text per column. */
export interface GroupRangeResult {
  start: QuranPosition;
  end: QuranPosition;
  cells: Record<string, string>;
}

type PreviewResult = { response: QuranRangeResponse | null } | { error: string };

/**
 * Pick a group's range — from/to ayah, or from/to word for a word group — and
 * see the mushaf text it covers while picking. In add mode it also takes the
 * group's first text, optional: a group left blank is dropped when committed.
 */
@Component({
  selector: 'app-group-range-modal',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzInputNumberModule,
    NzModalModule,
    NzSelectModule,
    NzSpinModule,
    TranslateModule,
  ],
  templateUrl: './group-range-modal.component.html',
  styleUrl: './group-range-modal.component.less',
})
export class GroupRangeModalComponent {
  readonly visible = input(false);
  readonly template = input.required<AssetTemplate>();
  readonly mode = input<'add' | 'move'>('add');
  readonly initialStart = input<QuranPosition | null>(null);
  readonly initialEnd = input<QuranPosition | null>(null);
  /** Add mode: one text box per column key. */
  readonly columnKeys = input<string[]>([]);
  readonly columnTitles = input<Record<string, string>>({});
  readonly busy = input(false);
  /** A save error from the parent (translated), shown above the buttons. */
  readonly serverError = input<string | null>(null);
  readonly confirmed = output<GroupRangeResult>();
  readonly cancelled = output<void>();

  private readonly contentService = inject(AssetContentService);
  private readonly translate = inject(TranslateService);

  readonly surahs = SURAHS_METADATA;
  readonly isWords = computed(() => this.template() === 'word_group');
  readonly start = signal<QuranPosition>({ surah: 1, ayah: 1 });
  readonly end = signal<QuranPosition>({ surah: 1, ayah: 1 });
  readonly texts = signal<Record<string, string>>({});
  readonly preview = signal<QuranRangeResponse | null>(null);
  readonly previewLoading = signal(false);
  readonly previewError = signal<string | null>(null);

  /** The covered text, an ayah-end mark and number between consecutive ayahs. */
  readonly previewText = computed(() => {
    const units = this.preview()?.units ?? [];
    let text = '';
    units.forEach((unit, index) => {
      const previous = units[index - 1];
      if (previous && (previous.surah !== unit.surah || previous.ayah !== unit.ayah)) {
        text += ` ${AYAH_END}${previous.ayah} `;
      } else if (previous) {
        text += ' ';
      }
      text += unit.text;
    });
    return text;
  });

  readonly canConfirm = computed(
    () =>
      this.preview() !== null &&
      !this.previewLoading() &&
      this.previewError() === null &&
      !this.busy()
  );

  /** A range to preview; null when it is incomplete (a word still being typed). */
  private readonly ranges$ = new Subject<[QuranPosition, QuranPosition] | null>();

  constructor() {
    this.ranges$
      .pipe(
        // A newer pick cancels both the wait and any request still in flight for an
        // older range, so an old answer can never show under the new range.
        switchMap((range) =>
          range === null
            ? of<PreviewResult>({ response: null })
            : timer(PREVIEW_DEBOUNCE_MS).pipe(
                switchMap(() => this.contentService.quranRange(range[0], range[1])),
                map((response): PreviewResult => ({ response })),
                catchError((err: HttpErrorResponse) =>
                  of<PreviewResult>({ error: this.errorText(err) })
                )
              )
        ),
        takeUntilDestroyed()
      )
      .subscribe((result) => {
        this.previewLoading.set(false);
        if ('response' in result) {
          this.preview.set(result.response);
          this.previewError.set(null);
        } else {
          this.preview.set(null);
          this.previewError.set(result.error);
        }
      });

    // Every opening starts from the given range (or 1:1) and previews it.
    effect(() => {
      if (this.visible()) untracked(() => this.reset());
    });
  }

  surahName(id: number): string {
    return surahLabel(id, this.translate.currentLang === 'ar');
  }

  ayahOptions(surah: number): number[] {
    const count = SURAHS_METADATA[surah - 1]?.ayahs ?? 1;
    return Array.from({ length: count }, (_, index) => index + 1);
  }

  /** Change one end of the range; an ayah past the new surah's end falls back to 1. */
  setPosition(which: 'start' | 'end', patch: Partial<QuranPosition>): void {
    const target = which === 'start' ? this.start : this.end;
    const next = { ...target(), ...patch };
    if (next.ayah > (SURAHS_METADATA[next.surah - 1]?.ayahs ?? 1)) next.ayah = 1;
    const position = this.normalize(next);
    target.set(position);
    // An end moved past the other one takes the other along, so the range stays valid.
    if (which === 'start' && comparePositions(position, this.end()) > 0) this.end.set(position);
    if (which === 'end' && comparePositions(position, this.start()) < 0) this.start.set(position);
    this.requestPreview();
  }

  setText(key: string, text: string): void {
    this.texts.update((texts) => ({ ...texts, [key]: text }));
  }

  confirm(): void {
    if (!this.canConfirm()) return;
    const cells =
      this.mode() === 'add'
        ? Object.fromEntries(Object.entries(this.texts()).filter(([, text]) => text.trim()))
        : {};
    this.confirmed.emit({ start: this.start(), end: this.end(), cells });
  }

  cancel(): void {
    this.cancelled.emit();
  }

  private reset(): void {
    this.start.set(this.normalize(this.initialStart() ?? { surah: 1, ayah: 1 }));
    this.end.set(this.normalize(this.initialEnd() ?? this.initialStart() ?? { surah: 1, ayah: 1 }));
    this.texts.set({});
    this.preview.set(null);
    this.previewError.set(null);
    this.requestPreview();
  }

  /** An ayah group's ends carry no word; a word group's start at word 1 and keep a
   *  cleared word (null) while it is being typed. */
  private normalize(position: QuranPosition): QuranPosition {
    if (!this.isWords()) return { surah: position.surah, ayah: position.ayah };
    const word = position.word === undefined ? 1 : position.word;
    return { surah: position.surah, ayah: position.ayah, word };
  }

  /** Preview the range once both ends are complete; until then, show nothing. */
  private requestPreview(): void {
    const start = this.start();
    const end = this.end();
    const complete = !this.isWords() || (start.word != null && end.word != null);
    this.previewLoading.set(complete);
    this.ranges$.next(complete ? [start, end] : null);
  }

  private errorText(err: HttpErrorResponse): string {
    const name: string | undefined = err?.error?.error_name;
    const key = name ? `ADMIN.CONTENT_EDITOR.ERRORS.${name.toUpperCase()}` : '';
    const translated = key ? this.translate.instant(key) : '';
    return translated || this.translate.instant('ADMIN.CONTENT_EDITOR.ERRORS.GENERIC');
  }
}
