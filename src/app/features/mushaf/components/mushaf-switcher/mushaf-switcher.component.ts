import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { MUSHAF_EDITIONS } from '../../data/mushaf-editions';
import { MushafSelectionService } from '../../services/mushaf-selection.service';

/**
 * Dropdown that switches the active mushaf edition (qiraa). Updates the shared
 * selection state and reflects the choice in the URL via `?mushaf=<slug>`.
 */
@Component({
  selector: 'app-mushaf-switcher',
  standalone: true,
  imports: [FormsModule, NzSelectModule, TranslateModule],
  templateUrl: './mushaf-switcher.component.html',
  styleUrl: './mushaf-switcher.component.less',
})
export class MushafSwitcherComponent {
  private readonly selection = inject(MushafSelectionService);
  private readonly router = inject(Router);

  protected readonly editions = MUSHAF_EDITIONS;
  protected readonly selectedSlug = this.selection.selected;

  protected onChange(slug: string): void {
    this.selection.select(slug);
    this.router.navigate([], {
      queryParams: { mushaf: slug },
      queryParamsHandling: 'merge',
    });
  }
}
