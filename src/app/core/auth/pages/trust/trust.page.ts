import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
import { resolveAuthErrorMessage } from '../../../../shared/utils/auth-error-resolver.util';
import { AuthBackLinkComponent } from '../../components/auth-back-link/auth-back-link.component';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-trust-page',
  imports: [TranslateModule, LangSwitchComponent, AuthBackLinkComponent],
  styleUrls: ['./trust.page.less'],
  templateUrl: './trust.page.html',
})
export class TrustPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  isLoading = false;
  readonly errorMessage = signal('');

  async submit(trust: boolean): Promise<void> {
    if (this.isLoading) {
      return;
    }
    this.isLoading = true;
    this.errorMessage.set('');
    try {
      await firstValueFrom(this.auth.headlessAuth.mfaTrust(trust));
      await this.router.navigateByUrl('/gallery');
    } catch (e) {
      if (e instanceof HttpErrorResponse) {
        this.errorMessage.set(
          resolveAuthErrorMessage(
            e,
            { fallbackKey: 'AUTH.TRUST.ERROR', context: 'trust' },
            this.translate
          )
        );
      } else {
        this.errorMessage.set(this.translate.instant('AUTH.TRUST.ERROR'));
      }
    } finally {
      this.isLoading = false;
    }
  }
}
