import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-trust-page',
  template: `
    <div style="padding: 24px; display: flex; gap: 12px; flex-direction: column; max-width: 420px">
      <p>Trust this browser?</p>
      <button type="button" (click)="submit(true)">Trust</button>
      <button type="button" (click)="submit(false)">Do not trust</button>
    </div>
  `,
})
export class TrustPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  async submit(trust: boolean): Promise<void> {
    await firstValueFrom(this.auth.headlessAuth.mfaTrust(trust));
    await this.router.navigateByUrl('/gallery');
  }
}
