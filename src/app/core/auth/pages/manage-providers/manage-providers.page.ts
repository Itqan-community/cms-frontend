import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { getErrorMessage } from '../../../../shared/utils/error.utils';
import {
  ConnectedProviderAccountRow,
  parseProviderAccountsEnvelope,
} from '../../headless/headless-account-data.util';
import { tryNavigateForAuth401 } from '../../headless/headless-auth-flow.util';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-manage-providers-page',
  imports: [CommonModule, RouterLink, TranslateModule, LangSwitchComponent],
  styleUrls: ['./manage-providers.page.less'],
  templateUrl: './manage-providers.page.html',
})
export class ManageProvidersPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly accounts = signal<ConnectedProviderAccountRow[]>([]);
  readonly isLoading = signal(false);
  readonly pageError = signal('');
  readonly successMsg = signal('');

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.pageError.set('');
    this.successMsg.set('');
    this.isLoading.set(true);
    try {
      const raw = await firstValueFrom(this.auth.headlessAuth.getProviderAccounts());
      this.accounts.set(parseProviderAccountsEnvelope(raw));
    } catch (e) {
      if (e instanceof HttpErrorResponse && tryNavigateForAuth401(this.router, e)) {
        return;
      }
      this.pageError.set(
        e instanceof HttpErrorResponse
          ? getErrorMessage(e) || this.translate.instant('AUTH.PROVIDERS.LOAD_ERROR')
          : this.translate.instant('AUTH.PROVIDERS.LOAD_ERROR')
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  async disconnect(providerId: string, accountUid: string): Promise<void> {
    if (!confirm(this.translate.instant('AUTH.PROVIDERS.DISCONNECT_CONFIRM'))) {
      return;
    }
    this.pageError.set('');
    this.successMsg.set('');
    this.isLoading.set(true);
    try {
      await firstValueFrom(
        this.auth.headlessAuth.disconnectProviderAccount(providerId, accountUid)
      );
      this.successMsg.set(this.translate.instant('AUTH.PROVIDERS.DISCONNECT_SUCCESS'));
      await this.reload();
    } catch (e) {
      if (e instanceof HttpErrorResponse && tryNavigateForAuth401(this.router, e)) {
        return;
      }
      this.pageError.set(
        e instanceof HttpErrorResponse
          ? getErrorMessage(e) || this.translate.instant('AUTH.PROVIDERS.ACTION_ERROR')
          : this.translate.instant('AUTH.PROVIDERS.ACTION_ERROR')
      );
    } finally {
      this.isLoading.set(false);
    }
  }
}
