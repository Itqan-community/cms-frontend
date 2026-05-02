import { AsyncPipe, JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-manage-providers-page',
  imports: [AsyncPipe, JsonPipe],
  template: `
    <div style="padding: 24px">
      <h2>Social accounts</h2>
      <pre>{{ accounts$ | async | json }}</pre>
    </div>
  `,
})
export class ManageProvidersPage {
  private readonly auth = inject(AuthService);
  readonly accounts$: Observable<unknown> = this.auth.headlessAuth.getProviderAccounts();
}
