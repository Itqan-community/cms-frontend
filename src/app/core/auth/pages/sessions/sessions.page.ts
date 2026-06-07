import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import { ManagedSession, parseSessionsEnvelope } from '../../headless/headless-account-data.util';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-sessions-page',
  imports: [CommonModule, RouterLink, TranslateModule, LangSwitchComponent],
  styleUrls: ['./sessions.page.less'],
  templateUrl: './sessions.page.html',
})
export class SessionsPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly sessions = signal<ManagedSession[]>([]);
  readonly isLoading = signal(false);
  readonly pageError = signal('');
  readonly successMsg = signal('');

  readonly otherSessionIds = computed(() =>
    this.sessions()
      .filter((s) => !s.is_current)
      .map((s) => s.id)
  );

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.pageError.set('');
    this.successMsg.set('');
    this.isLoading.set(true);
    try {
      const raw = await firstValueFrom(this.auth.headlessAuth.getSessions());
      const list = parseSessionsEnvelope(raw);
      this.markCurrentIfSingle(list);
      this.sessions.set(list);
    } catch (e) {
      if (e instanceof HttpErrorResponse && tryNavigateForAuth401(this.router, e)) {
        return;
      }
      this.pageError.set(
        e instanceof HttpErrorResponse
          ? getErrorMessage(e) || this.translate.instant('AUTH.SESSIONS.LOAD_ERROR')
          : this.translate.instant('AUTH.SESSIONS.LOAD_ERROR')
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  /** When API omits `is_current` and only one session exists, treat it as this device. */
  private markCurrentIfSingle(list: ManagedSession[]): void {
    if (list.length !== 1) {
      return;
    }
    const only = list[0];
    if (only.is_current === undefined) {
      only.is_current = true;
    }
  }

  async revokeOne(id: string): Promise<void> {
    if (!confirm(this.translate.instant('AUTH.SESSIONS.REVOKE_CONFIRM'))) {
      return;
    }
    await this.revokeIds([id]);
  }

  async revokeOthers(): Promise<void> {
    const ids = this.otherSessionIds();
    if (!ids.length) {
      return;
    }
    if (!confirm(this.translate.instant('AUTH.SESSIONS.REVOKE_OTHERS_CONFIRM'))) {
      return;
    }
    await this.revokeIds(ids);
  }

  private async revokeIds(ids: string[]): Promise<void> {
    this.pageError.set('');
    this.successMsg.set('');
    this.isLoading.set(true);
    try {
      await firstValueFrom(this.auth.headlessAuth.endSessions(ids));
      this.successMsg.set(this.translate.instant('AUTH.SESSIONS.REVOKE_SUCCESS'));
      await this.reload();
    } catch (e) {
      if (e instanceof HttpErrorResponse && tryNavigateForAuth401(this.router, e)) {
        return;
      }
      this.pageError.set(
        e instanceof HttpErrorResponse
          ? getErrorMessage(e) || this.translate.instant('AUTH.SESSIONS.ACTION_ERROR')
          : this.translate.instant('AUTH.SESSIONS.ACTION_ERROR')
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
