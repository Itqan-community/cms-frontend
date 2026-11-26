import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, output, signal } from '@angular/core';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { resolveApiErrorMessage } from '../../../../shared/utils/api-error-resolver.util';
import {
  AiFieldKey,
  AiTranslateCategory,
  AiTranslateRequest,
  AiTranslateService,
} from '../../services/ai-translate.service';
import type { VersionText } from '../../utils/version-text.util';

type VersionField = 'label' | 'summary';
/** The version's name and summary (or commit message), as the translate endpoint names them. */
const API_KEYS: Record<VersionField, AiFieldKey> = {
  label: 'version_name',
  summary: 'version_summary',
};
const FIELDS = Object.keys(API_KEYS) as VersionField[];

/**
 * "Translate to English" for a version's name and summary (the add/edit version form and the
 * content editor's commit message). Fills the empty English fields from the Arabic ones; when
 * every English field is already filled, it asks before replacing them. A field the user edits
 * while the request runs is left as typed.
 */
@Component({
  selector: 'app-ai-translate-version-text',
  standalone: true,
  imports: [NzButtonModule, NgIcon, TranslateModule],
  template: `
    <button
      nz-button
      type="button"
      class="ai-translate-version-text"
      [nzLoading]="loading()"
      [disabled]="loading()"
      (click)="run()"
    >
      <ng-icon name="lucideLanguages" />
      {{ 'ADMIN.AI_TRANSLATE.TO_ENGLISH' | translate }}
    </button>
  `,
  styles: `
    :host {
      display: block;
      margin-bottom: 16px;
    }
  `,
})
export class AiTranslateVersionTextComponent {
  private readonly api = inject(AiTranslateService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly translate = inject(TranslateService);

  /** The current Arabic and English name and summary. */
  readonly text = input.required<VersionText>();
  readonly category = input.required<AiTranslateCategory>();
  /** English values to set, only for fields still as they were when the request was sent. */
  readonly translated = output<Partial<VersionText>>();

  readonly loading = signal(false);

  run(): void {
    const text = this.text();
    const withArabic = FIELDS.filter((f) => text[`${f}_ar`].trim());
    if (!withArabic.length) {
      this.message.info(this.translate.instant('ADMIN.AI_TRANSLATE.NEED_VERSION_ARABIC'));
      return;
    }
    const empty = withArabic.filter((f) => !text[`${f}_en`].trim());
    if (empty.length) {
      this.request(empty, text);
      return;
    }
    // Everything already has English: the user typed it or translated before. Ask first.
    this.modal.confirm({
      nzTitle: this.translate.instant('ADMIN.AI_TRANSLATE.REPLACE_TITLE'),
      nzContent: this.translate.instant('ADMIN.AI_TRANSLATE.REPLACE_BODY'),
      nzOkText: this.translate.instant('ADMIN.AI_TRANSLATE.REPLACE_OK'),
      nzCancelText: this.translate.instant('ADMIN.COMMON.CANCEL'),
      nzOnOk: () => this.request(withArabic, text),
    });
  }

  private request(targets: VersionField[], sent: VersionText): void {
    const fields: Partial<Record<AiFieldKey, string>> = {};
    const reference: Partial<Record<AiFieldKey, string>> = {};
    for (const field of FIELDS) {
      const arabic = sent[`${field}_ar`].trim();
      if (targets.includes(field)) fields[API_KEYS[field]] = arabic;
      else if (arabic) reference[API_KEYS[field]] = arabic;
    }
    const request: AiTranslateRequest = { mode: 'translate', category: this.category(), fields };
    if (Object.keys(reference).length) request.reference = reference;

    this.loading.set(true);
    this.api.translate(request).subscribe({
      next: (res) => {
        this.loading.set(false);
        const current = this.text();
        const result: Partial<VersionText> = {};
        for (const field of targets) {
          const value = res.fields[API_KEYS[field]];
          const key = `${field}_en` as const;
          // Typed while the request ran: keep the user's text.
          if (value && current[key] === sent[key]) result[key] = value;
        }
        if (!Object.keys(result).length) return;
        this.translated.emit(result);
        this.message.success(this.translate.instant('ADMIN.AI_TRANSLATE.VERSION_DONE'));
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
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
}
