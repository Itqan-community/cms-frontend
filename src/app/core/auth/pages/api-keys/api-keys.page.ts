import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { resolveAuthErrorMessage } from '../../../../shared/utils/auth-error-resolver.util';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import type { ApiKeyPatchIn, ManagedApiKey } from '../../models/api-keys.model';
import { AuthService } from '../../services/auth.service';

/** Request headers developers send with every API call (see the API docs authentication guide). */
export const API_KEY_USAGE_SNIPPET = `X-API-Key: <YOUR_PUBLIC_KEY>
X-External-User-Id: <OPTIONAL_ANONYMOUS_USER_ID>`;

@Component({
  standalone: true,
  selector: 'app-api-keys-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TranslateModule, LangSwitchComponent],
  styleUrls: ['./api-keys.page.less'],
  templateUrl: './api-keys.page.html',
})
export class ApiKeysPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);

  readonly keys = signal<ManagedApiKey[]>([]);
  readonly isLoading = signal(false);
  readonly pageError = signal('');
  readonly successMsg = signal('');
  readonly showCreateForm = signal(false);

  readonly usageSnippet = API_KEY_USAGE_SNIPPET;
  readonly authDocsUrl = `${environment.API_DOCS_URL}/docs/getting-started/authentication/`;

  /**
   * Full keys returned by create in this visit, by key id. The list endpoint does not return
   * full keys yet; when it does, `ManagedApiKey.fullKey` takes over. Kept in memory only.
   */
  private readonly createdKeys = signal<Record<string, string>>({});

  readonly editingId = signal<string | null>(null);
  readonly renameDraft = signal<Record<string, string>>({});
  readonly slugDraft = signal<Record<string, string>>({});
  private readonly savedSlugs = new Map<string, string>();

  readonly createForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(120)]],
  });

  ngOnInit(): void {
    void this.reload();
  }

  openCreateForm(): void {
    this.showCreateForm.set(true);
  }

  cancelCreateForm(): void {
    this.createForm.reset({ name: '' });
    this.showCreateForm.set(false);
  }

  async reload(): Promise<void> {
    this.pageError.set('');
    this.successMsg.set('');
    this.isLoading.set(true);
    try {
      const list = await firstValueFrom(this.auth.listApiKeys());
      this.keys.set(list);
    } catch (e) {
      if (e instanceof HttpErrorResponse && tryNavigateForAuth401(this.router, e)) {
        return;
      }
      this.pageError.set(
        e instanceof HttpErrorResponse
          ? resolveAuthErrorMessage(
              e,
              { fallbackKey: 'AUTH.API_KEYS.LOAD_ERROR', context: 'api_keys' },
              this.translate
            )
          : this.translate.instant('AUTH.API_KEYS.LOAD_ERROR')
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async onCreate(): Promise<void> {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    const name = this.createForm.controls.name.value.trim();

    this.pageError.set('');
    this.successMsg.set('');
    this.isLoading.set(true);
    try {
      const result = await firstValueFrom(this.auth.createApiKey({ name }));
      if (result.key.id && result.rawKey.trim()) {
        this.createdKeys.update((keys) => ({ ...keys, [result.key.id]: result.rawKey.trim() }));
      }
      this.successMsg.set(this.translate.instant('AUTH.API_KEYS.CREATE_SUCCESS'));
      this.createForm.reset({ name: '' });
      this.showCreateForm.set(false);
      await this.reloadQuiet();
      if (!result.rawKey.trim()) {
        this.pageError.set(this.translate.instant('AUTH.API_KEYS.CREATE_MISSING_RAW_HINT'));
      }
    } catch (e) {
      if (e instanceof HttpErrorResponse && tryNavigateForAuth401(this.router, e)) {
        return;
      }
      this.pageError.set(
        e instanceof HttpErrorResponse
          ? resolveAuthErrorMessage(
              e,
              { fallbackKey: 'AUTH.API_KEYS.ACTION_ERROR', context: 'api_keys' },
              this.translate
            )
          : this.translate.instant('AUTH.API_KEYS.ACTION_ERROR')
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Reload list without clearing unrelated banners (after create). */
  private async reloadQuiet(): Promise<void> {
    this.isLoading.set(true);
    try {
      const list = await firstValueFrom(this.auth.listApiKeys());
      this.keys.set(list);
    } catch (e) {
      if (!(e instanceof HttpErrorResponse && tryNavigateForAuth401(this.router, e))) {
        this.pageError.set(
          e instanceof HttpErrorResponse
            ? resolveAuthErrorMessage(
                e,
                { fallbackKey: 'AUTH.API_KEYS.LOAD_ERROR', context: 'api_keys' },
                this.translate
              )
            : this.translate.instant('AUTH.API_KEYS.LOAD_ERROR')
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Full key for a row, or '' when only a masked preview is available. */
  fullKeyFor(k: ManagedApiKey): string {
    return k.fullKey || this.createdKeys()[k.id] || '';
  }

  /** Copies a full key; masked previews are never copied. */
  async copyKey(k: ManagedApiKey): Promise<void> {
    const key = this.fullKeyFor(k);
    if (!key) {
      return;
    }
    await this.copyText(key);
  }

  async copySnippet(): Promise<void> {
    await this.copyText(this.usageSnippet);
  }

  private async copyText(text: string): Promise<void> {
    this.pageError.set('');
    this.successMsg.set('');
    try {
      await navigator.clipboard.writeText(text);
      this.successMsg.set(this.translate.instant('AUTH.API_KEYS.COPY_OK'));
    } catch {
      this.pageError.set(this.translate.instant('AUTH.API_KEYS.COPY_ERROR'));
    }
  }

  startRename(k: ManagedApiKey): void {
    this.pageError.set('');
    this.editingId.set(k.id);
    const next = { ...this.renameDraft() };
    next[k.id] = k.name;
    this.renameDraft.set(next);
    this.savedSlugs.set(k.id, k.appSlug ?? '');
    this.slugDraft.set({ ...this.slugDraft(), [k.id]: k.appSlug ?? '' });
  }

  draftSlug(id: string): string {
    return this.slugDraft()[id] ?? '';
  }

  updateSlugDraft(id: string, value: string): void {
    this.slugDraft.set({ ...this.slugDraft(), [id]: value });
  }

  cancelRename(): void {
    this.editingId.set(null);
  }

  draftName(id: string): string {
    return this.renameDraft()[id] ?? '';
  }

  updateDraft(id: string, value: string): void {
    const next = { ...this.renameDraft() };
    next[id] = value;
    this.renameDraft.set(next);
  }

  async saveRename(id: string): Promise<void> {
    const name = (this.renameDraft()[id] ?? '').trim();
    if (!name) {
      this.pageError.set(this.translate.instant('AUTH.API_KEYS.RENAME_REQUIRED'));
      return;
    }
    const slug = (this.slugDraft()[id] ?? '').trim();
    // The API cannot clear a slug; say so instead of saving the name and keeping the old one.
    if (!slug && this.savedSlugs.get(id)) {
      this.pageError.set(this.translate.instant('AUTH.API_KEYS.SLUG_REQUIRED'));
      return;
    }

    this.pageError.set('');
    this.successMsg.set('');
    this.isLoading.set(true);
    try {
      const patch: ApiKeyPatchIn = { name };
      if (slug && slug !== this.savedSlugs.get(id)) {
        patch.app_slug = slug;
      }
      await firstValueFrom(this.auth.updateApiKey(id, patch));
      this.editingId.set(null);
      this.successMsg.set(this.translate.instant('AUTH.API_KEYS.RENAME_SUCCESS'));
      await this.reloadQuiet();
    } catch (e) {
      if (e instanceof HttpErrorResponse && tryNavigateForAuth401(this.router, e)) {
        return;
      }
      this.pageError.set(
        e instanceof HttpErrorResponse
          ? resolveAuthErrorMessage(
              e,
              { fallbackKey: 'AUTH.API_KEYS.ACTION_ERROR', context: 'api_keys' },
              this.translate
            )
          : this.translate.instant('AUTH.API_KEYS.ACTION_ERROR')
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async revokeKey(id: string): Promise<void> {
    if (!confirm(this.translate.instant('AUTH.API_KEYS.REVOKE_CONFIRM'))) {
      return;
    }
    this.pageError.set('');
    this.successMsg.set('');
    this.isLoading.set(true);
    try {
      await firstValueFrom(this.auth.updateApiKey(id, { revoked: true }));
      this.successMsg.set(this.translate.instant('AUTH.API_KEYS.REVOKE_SUCCESS'));
      await this.reloadQuiet();
    } catch (e) {
      if (e instanceof HttpErrorResponse && tryNavigateForAuth401(this.router, e)) {
        return;
      }
      this.pageError.set(
        e instanceof HttpErrorResponse
          ? resolveAuthErrorMessage(
              e,
              { fallbackKey: 'AUTH.API_KEYS.ACTION_ERROR', context: 'api_keys' },
              this.translate
            )
          : this.translate.instant('AUTH.API_KEYS.ACTION_ERROR')
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteKey(id: string): Promise<void> {
    if (!confirm(this.translate.instant('AUTH.API_KEYS.DELETE_CONFIRM'))) {
      return;
    }
    this.pageError.set('');
    this.successMsg.set('');
    this.isLoading.set(true);
    try {
      await firstValueFrom(this.auth.deleteApiKey(id));
      this.successMsg.set(this.translate.instant('AUTH.API_KEYS.DELETE_SUCCESS'));
      await this.reloadQuiet();
    } catch (e) {
      if (e instanceof HttpErrorResponse && tryNavigateForAuth401(this.router, e)) {
        return;
      }
      this.pageError.set(
        e instanceof HttpErrorResponse
          ? resolveAuthErrorMessage(
              e,
              { fallbackKey: 'AUTH.API_KEYS.ACTION_ERROR', context: 'api_keys' },
              this.translate
            )
          : this.translate.instant('AUTH.API_KEYS.ACTION_ERROR')
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
