import { NgTemplateOutlet } from '@angular/common';
import { Component, OnDestroy, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxComponent, NzCheckboxGroupComponent } from 'ng-zorro-antd/checkbox';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { Categories } from '../../../core/enums/categories.enum';
import { Licenses } from '../../../core/enums/licenses.enum';
import { LicenseTagComponent } from '../license-tag/license-tag.component';

import { ViewportService } from '../../../core/services/viewport.service';

@Component({
  selector: 'app-filters',
  imports: [
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzDrawerModule,
    TranslatePipe,
    NgTemplateOutlet,
    NzCheckboxGroupComponent,
    NzCheckboxComponent,
    FormsModule,
    LicenseTagComponent,
  ],
  templateUrl: './filters.component.html',
  styleUrl: './filters.component.less',
})
export class FiltersComponent implements OnDestroy {
  private readonly translate = inject(TranslateService);
  private readonly viewportService = inject(ViewportService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();

  readonly categoriesOptions = [
    { label: this.translate.instant(`CATEGORIES.${Categories.MUSHAF}`), value: Categories.MUSHAF },
    { label: this.translate.instant(`CATEGORIES.${Categories.TAFSIR}`), value: Categories.TAFSIR },
    {
      label: this.translate.instant(`CATEGORIES.${Categories.RECITATION}`),
      value: Categories.RECITATION,
    },
  ];
  readonly licensesOptions = [
    { label: this.translate.instant(`LICENSES_LABELS.${Licenses.CC0}`), value: Licenses.CC0 },
    { label: this.translate.instant(`LICENSES_LABELS.${Licenses.CC_BY}`), value: Licenses.CC_BY },
    {
      label: this.translate.instant(`LICENSES_LABELS.${Licenses.CC_BY_SA}`),
      value: Licenses.CC_BY_SA,
    },
    {
      label: this.translate.instant(`LICENSES_LABELS.${Licenses.CC_BY_ND}`),
      value: Licenses.CC_BY_ND,
    },
    {
      label: this.translate.instant(`LICENSES_LABELS.${Licenses.CC_BY_NC}`),
      value: Licenses.CC_BY_NC,
    },
    {
      label: this.translate.instant(`LICENSES_LABELS.${Licenses.CC_BY_NC_SA}`),
      value: Licenses.CC_BY_NC_SA,
    },
    {
      label: this.translate.instant(`LICENSES_LABELS.${Licenses.CC_BY_NC_ND}`),
      value: Licenses.CC_BY_NC_ND,
    },
  ];

  searchQuery = signal<string>('');
  searchQueryChange = output<string>();

  categoriesSelection = signal<string[]>([]);
  categoriesSelectionChange = output<string[]>();

  licensesSelection = signal<string[]>([]);
  licensesSelectionChange = output<string[]>();

  readonly isMobileView = this.viewportService.isMobile;
  showFiltersDrawer = signal(false);

  constructor() {
    // Set up debounced search with 300ms delay
    this.searchSubject$
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((query) => {
        this.searchQueryChange.emit(query);
      });
  }

  // ngOnInit removed as it was empty

  toggleFiltersDrawer() {
    this.showFiltersDrawer.update((v) => !v);
  }

  onSearchQueryChange(event: string) {
    this.searchQuery.set(event);
    this.searchSubject$.next(event);
  }

  onCategoriesSelectionChange(event: string[]) {
    this.categoriesSelectionChange.emit(event);
  }

  onLicensesSelectionChange(event: string[]) {
    this.licensesSelectionChange.emit(event);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
