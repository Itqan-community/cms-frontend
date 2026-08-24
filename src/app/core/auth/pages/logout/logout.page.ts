import { Component, OnInit, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-logout-page',
  imports: [TranslateModule],
  template: `<p style="padding: 24px">{{ 'AUTH.LOGOUT.SIGNING_OUT' | translate }}</p>`,
})
export class LogoutPage implements OnInit {
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    this.auth.logout().subscribe();
  }
}
