import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { LangSwitchComponent } from '../../../../shared/components/lang-switch/lang-switch.component';
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
  isLoading = false;

  async submit(trust: boolean): Promise<void> {
    if (this.isLoading) {
      return;
    }
    this.isLoading = true;
    try {
      await firstValueFrom(this.auth.headlessAuth.mfaTrust(trust));
      await this.router.navigateByUrl('/gallery');
    } finally {
      this.isLoading = false;
    }
  }
}
