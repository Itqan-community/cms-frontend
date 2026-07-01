import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AdminTenantNavigationService {
  assign(url: string): void {
    window.location.assign(url);
  }
}
