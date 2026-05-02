import { AsyncPipe, JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-change-email-page',
  imports: [AsyncPipe, JsonPipe],
  template: `
    <div style="padding: 24px">
      <h2>Email addresses</h2>
      <pre>{{ emails$ | async | json }}</pre>
    </div>
  `,
})
export class ChangeEmailPage {
  private readonly auth = inject(AuthService);
  readonly emails$: Observable<unknown> = this.auth.headlessAuth.getEmailAddresses();
}
