import { Injectable } from '@angular/core';
import { rememberTenantSwitch } from '../utils/admin-tenant-navigation.util';

@Injectable({ providedIn: 'root' })
export class AdminTenantNavigationService {
  /** Reloads at `url` for the newly selected publisher. */
  assign(url: string): void {
    rememberTenantSwitch();
    this.load(url);
  }

  private load(url: string): void {
    window.location.assign(url);
  }
}
