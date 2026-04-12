import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NgIcon } from '@ng-icons/core';
import { AdminTableColumnPrefsService } from '../../services/admin-table-column-prefs.service';

/** `label` is an ngx-translate key (e.g. ADMIN.TAFSIRS.COLUMNS.NAME). */
export interface AdminTableColumnOption {
  key: string;
  label: string;
}

@Component({
  selector: 'app-admin-column-picker',
  standalone: true,
  imports: [FormsModule, TranslateModule, NzButtonModule, NzPopoverModule, NgIcon],
  templateUrl: './admin-column-picker.component.html',
  styleUrl: './admin-column-picker.component.less',
})
export class AdminColumnPickerComponent implements OnInit {
  private readonly prefs = inject(AdminTableColumnPrefsService);

  /** localStorage key suffix (namespaced by service) */
  readonly storageKey = input.required<string>();
  readonly columns = input.required<AdminTableColumnOption[]>();

  readonly visibilityChange = output<Record<string, boolean>>();

  private readonly visibility = signal<Record<string, boolean>>({});

  ngOnInit(): void {
    this.applyFromStorage();
  }

  isChecked(key: string): boolean {
    return this.visibility()[key] !== false;
  }

  onToggle(key: string, checked: boolean): void {
    const current = this.visibility();
    const next = { ...current, [key]: checked };
    const visibleCount = this.columns().filter((c) => next[c.key] !== false).length;
    if (visibleCount === 0) {
      return;
    }
    this.visibility.set(next);
    this.prefs.save(this.storageKey(), next);
    this.visibilityChange.emit({ ...next });
  }

  private applyFromStorage(): void {
    const saved = this.prefs.load(this.storageKey());
    const next: Record<string, boolean> = {};
    for (const c of this.columns()) {
      next[c.key] = saved?.[c.key] !== false;
    }
    this.visibility.set(next);
    this.visibilityChange.emit({ ...next });
  }
}
