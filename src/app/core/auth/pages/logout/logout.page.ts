import { Component, OnInit, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-logout-page',
  template: `<p style="padding: 24px">Signing out…</p>`,
})
export class LogoutPage implements OnInit {
  private readonly auth = inject(AuthService);

  ngOnInit(): void {
    this.auth.logout().subscribe();
  }
}
