import { AsyncPipe, JsonPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-sessions-page',
  imports: [AsyncPipe, JsonPipe],
  template: `
    <div style="padding: 24px">
      <h2>Sessions</h2>
      <pre>{{ sessions$ | async | json }}</pre>
    </div>
  `,
})
export class SessionsPage {
  private readonly auth = inject(AuthService);
  readonly sessions$: Observable<unknown> = this.auth.headlessAuth.getSessions();
}
