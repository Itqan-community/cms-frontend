import { Injectable } from '@angular/core';

const LS_PREFIX = 'admin-table-cols:';

@Injectable({ providedIn: 'root' })
export class AdminTableColumnPrefsService {
  load(tableKey: string): Record<string, boolean> | null {
    try {
      const raw = localStorage.getItem(LS_PREFIX + tableKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, boolean>;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  save(tableKey: string, visibility: Record<string, boolean>): void {
    try {
      localStorage.setItem(LS_PREFIX + tableKey, JSON.stringify(visibility));
    } catch {
      /* quota / private mode */
    }
  }
}
