import { Injectable } from '@angular/core';

const LS_PREFIX = 'admin-table-sort:';

@Injectable({ providedIn: 'root' })
export class AdminTableSortPrefsService {
  load(tableKey: string): string | undefined {
    try {
      const raw = localStorage.getItem(LS_PREFIX + tableKey);
      if (raw) return raw;
    } catch {
      /* ignore */
    }
    return undefined;
  }

  save(tableKey: string, ordering: string): void {
    try {
      localStorage.setItem(LS_PREFIX + tableKey, ordering);
    } catch {
      /* quota / private mode */
    }
  }

  clear(tableKey: string): void {
    try {
      localStorage.removeItem(LS_PREFIX + tableKey);
    } catch {
      /* quota / private mode */
    }
  }
}
