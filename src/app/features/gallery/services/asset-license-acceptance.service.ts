import { Injectable } from '@angular/core';

const LS_PREFIX = 'gallery-license-accepted:';

@Injectable({ providedIn: 'root' })
export class AssetLicenseAcceptanceService {
  hasAccepted(userId: string): boolean {
    if (!userId.trim()) {
      return false;
    }
    try {
      const raw = localStorage.getItem(LS_PREFIX + userId);
      return typeof raw === 'string' && raw.length > 0;
    } catch {
      return false;
    }
  }

  recordAcceptance(userId: string): void {
    if (!userId.trim()) {
      return;
    }
    try {
      localStorage.setItem(LS_PREFIX + userId, new Date().toISOString());
    } catch {
      /* quota / private mode */
    }
  }
}
