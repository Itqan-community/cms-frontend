import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import type { ManagedApiKey } from '../../models/api-keys.model';
import { AuthService } from '../../services/auth.service';

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

  /** One-time plaintext after create; cleared when user dismisses. */
  readonly revealedRawKey = signal<{ keyLabel: string; raw: string } | null>(null);

  readonly editingId = signal<string | null>(null);
  readonly renameDraft = signal<Record<string, string>>({});

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
          ? getErrorMessage(e) || this.translate.instant('AUTH.API_KEYS.LOAD_ERROR')
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
      this.revealedRawKey.set({
        keyLabel: result.key.name || name,
        raw: result.rawKey,
      });
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
          ? getErrorMessage(e) || this.translate.instant('AUTH.API_KEYS.ACTION_ERROR')
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
            ? getErrorMessage(e) || this.translate.instant('AUTH.API_KEYS.LOAD_ERROR')
            : this.translate.instant('AUTH.API_KEYS.LOAD_ERROR')
        );
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  dismissReveal(): void {
    this.revealedRawKey.set(null);
  }

  async copyRawKey(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.successMsg.set(this.translate.instant('AUTH.API_KEYS.COPY_OK'));
    } catch {
      /* ignore — clipboard unavailable */
    }
  }

  startRename(k: ManagedApiKey): void {
    this.pageError.set('');
    this.editingId.set(k.id);
    const next = { ...this.renameDraft() };
    next[k.id] = k.name;
    this.renameDraft.set(next);
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

    this.pageError.set('');
    this.successMsg.set('');
    this.isLoading.set(true);
    try {
      await firstValueFrom(this.auth.updateApiKey(id, { name }));
      this.editingId.set(null);
      this.successMsg.set(this.translate.instant('AUTH.API_KEYS.RENAME_SUCCESS'));
      await this.reloadQuiet();
    } catch (e) {
      if (e instanceof HttpErrorResponse && tryNavigateForAuth401(this.router, e)) {
        return;
      }
      this.pageError.set(
        e instanceof HttpErrorResponse
          ? getErrorMessage(e) || this.translate.instant('AUTH.API_KEYS.ACTION_ERROR')
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
          ? getErrorMessage(e) || this.translate.instant('AUTH.API_KEYS.ACTION_ERROR')
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
          ? getErrorMessage(e) || this.translate.instant('AUTH.API_KEYS.ACTION_ERROR')
          : this.translate.instant('AUTH.API_KEYS.ACTION_ERROR')
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
