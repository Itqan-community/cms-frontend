import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { resolveApiErrorMessage } from '../../../../shared/utils/api-error-resolver.util';
import {
  AiFieldKey,
  AiSlugFor,
  AiTranslateCategory,
  AiTranslateContext,
  AiTranslateMode,
  AiTranslateRequest,
  AiTranslateService,
} from '../../services/ai-translate.service';

/** `<key>_ar` → `<key>_en` control pairs; pairs missing from the form are skipped. */
const FIELD_KEYS: AiFieldKey[] = [
  'name',
  'description',
  'long_description',
  'bio',
  'version_name',
  'version_summary',
];
/** Fields "Write from the web" fills even when their Arabic value is empty. */
const WEB_FIELDS = new Set<AiFieldKey>(['description', 'long_description', 'bio']);

/**
 * "Translate from Arabic" / "Write from the web" buttons for admin create forms.
 * One request per click: it fills only English controls that are empty (typed English is never
 * overwritten) and, when the form has a `slug` control, also returns the asset's package slug.
 */
@Component({
  selector: 'app-ai-translate-actions',
  standalone: true,
  imports: [
    NzButtonModule,
    NzInputModule,
    NzToolTipModule,
    NgIcon,
    ReactiveFormsModule,
    TranslateModule,
  ],
  templateUrl: './ai-translate-actions.component.html',
  styleUrl: './ai-translate-actions.component.less',
})
export class AiTranslateActionsComponent {
  private readonly api = inject(AiTranslateService);
  private readonly message = inject(NzMessageService);
  private readonly translate = inject(TranslateService);

  readonly form = input.required<FormGroup>();
  readonly category = input.required<AiTranslateCategory>();
  readonly context = input<AiTranslateContext>({});

  readonly loading = signal<AiTranslateMode | null>(null);
  readonly sources = signal<string[]>([]);
  /** True once generation failed: the admin then types the package slug. */
  readonly slugEditable = signal(false);

  /**
   * A recitation's identifier is built from its reciter and riwayah: when either changes, a
   * generated identifier no longer matches and must be generated again.
   */
  private readonly clearStaleIdentifier = effect((onCleanup) => {
    const form = this.form();
    if (this.category() !== 'recitation') return;
    let identity = this.recitationIdentity();
    const subscription = form.valueChanges.subscribe(() => {
      const next = this.recitationIdentity();
      if (next === identity) return;
      identity = next;
      const control = this.slugControl();
      if (control?.value && !this.slugEditable()) {
        control.setValue('');
        control.markAsPristine();
      }
    });
    onCleanup(() => subscription.unsubscribe());
  });

  /** The form's package slug control (asset create forms only). */
  slugControl(): FormControl | null {
    const control = this.category() === 'reciter' ? null : this.form().get('slug');
    return control instanceof FormControl ? control : null;
  }

  /** True once the admin typed the Arabic name: the identifier can be generated from then on. */
  hasArabicName(): boolean {
    return !!String(this.form().get('name_ar')?.value ?? '').trim();
  }

  /** Wikipedia links are percent-encoded; show Arabic titles readably (malformed input is shown as is). */
  displayUrl(url: string): string {
    try {
      return decodeURI(url);
    } catch {
      return url;
    }
  }

  run(mode: AiTranslateMode): void {
    const form = this.form();
    const fields: Partial<Record<AiFieldKey, string>> = {};
    let hasTarget = false;
    let hasArabic = false;
    for (const key of FIELD_KEYS) {
      const ar = form.get(`${key}_ar`);
      const en = form.get(`${key}_en`);
      if (!ar || !en) continue;
      const arabic = String(ar.value ?? '').trim();
      hasArabic ||= !!arabic;
      const englishEmpty = !String(en.value ?? '').trim();
      if (englishEmpty && (arabic || (mode === 'web' && WEB_FIELDS.has(key)))) {
        fields[key] = arabic;
        hasTarget = true;
      } else if (mode === 'web' && key === 'name' && arabic) {
        // The Arabic name is what the web research looks up, even when the English name is set.
        fields[key] = arabic;
      }
    }
    const slugFor = this.slugInputs();
    // No Arabic and no name to build a slug from: there is nothing to work with yet.
    if (!hasArabic && !slugFor) {
      this.message.info(this.translate.instant('ADMIN.AI_TRANSLATE.NEED_ARABIC'));
      return;
    }
    if (!hasTarget && !slugFor) {
      this.message.info(this.translate.instant('ADMIN.AI_TRANSLATE.NOTHING_TO_FILL'));
      return;
    }

    const request: AiTranslateRequest = {
      mode,
      category: this.category(),
      fields,
      context: this.context(),
    };
    if (slugFor) request.slug_for = slugFor;
    // The identifier is only valid for the inputs it was generated from.
    const slugInputsSent = JSON.stringify(slugFor);
    this.loading.set(mode);
    this.sources.set([]);
    this.api.translate(request).subscribe({
      next: (res) => {
        // Checked before filling English fields, which are themselves slug inputs.
        const inputsUnchanged = JSON.stringify(this.slugInputs()) === slugInputsSent;
        for (const [key, value] of Object.entries(res.fields)) {
          const en = form.get(`${key}_en`);
          if (en && value && !String(en.value ?? '').trim()) {
            en.setValue(value);
            en.markAsDirty();
          }
        }
        if (slugFor && inputsUnchanged) this.applySlug(res.slug);
        this.sources.set(res.sources ?? []);
        this.loading.set(null);
        this.message.success(this.translate.instant('ADMIN.AI_TRANSLATE.DONE'));
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(null);
        if (slugFor) this.applySlug(null);
        if (error.status === 429) {
          // Per-minute limits clear in seconds; only the daily quota means "try tomorrow".
          const rateLimited = error.error?.error_name === 'ai_rate_limited';
          this.message.warning(
            this.translate.instant(
              rateLimited ? 'ADMIN.AI_TRANSLATE.RATE_LIMITED' : 'ADMIN.AI_TRANSLATE.QUOTA'
            )
          );
          return;
        }
        this.message.error(
          resolveApiErrorMessage(
            error,
            { fallbackKey: 'ADMIN.AI_TRANSLATE.FAILED' },
            this.translate
          )
        );
      },
    });
  }

  private recitationIdentity(): string {
    const form = this.form();
    return `${form.get('reciter_id')?.value ?? ''}|${form.get('riwayah_id')?.value ?? ''}`;
  }

  /** Slug inputs for the request, or null when the form has no slug or no name to build it from. */
  private slugInputs(): AiSlugFor | null {
    if (!this.slugControl()) return null;
    const value = (key: string): unknown => this.form().get(key)?.value;
    const slugFor: AiSlugFor = {
      name_ar: String(value('name_ar') ?? '').trim(),
      name_en: String(value('name_en') ?? '').trim(),
    };
    const language = value('language');
    if (typeof language === 'string' && language) slugFor.language = language;
    for (const key of ['reciter_id', 'riwayah_id', 'year'] as const) {
      const id = value(key);
      if (typeof id === 'number') slugFor[key] = id;
    }
    return slugFor.name_ar || slugFor.name_en || slugFor.reciter_id ? slugFor : null;
  }

  private applySlug(slug: string | null): void {
    const control = this.slugControl();
    if (!control) return;
    if (slug) {
      control.setValue(slug);
      control.markAsDirty();
      this.slugEditable.set(false);
    } else if (!control.value) {
      // Generation failed: let the admin type it rather than blocking creation.
      this.slugEditable.set(true);
    }
  }
}
