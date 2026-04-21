import { Directive, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { NzTableSortOrder } from 'ng-zorro-antd/table';
import { AdminTableSortPrefsService } from '../services/admin-table-sort-prefs.service';

/**
 * Base abstract class for Admin List components.
 * Handles generic pagination, sorting, active filters, column visibility,
 * and syncing state with URL query parameters.
 */
@Directive()
export abstract class AdminListBase<
  T,
  F extends Record<string, string | number | boolean | null | undefined>,
> {
  protected readonly router = inject(Router);
  protected readonly route = inject(ActivatedRoute);
  protected readonly sortPrefs = inject(AdminTableSortPrefsService);

  readonly items = signal<T[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly loading = signal(false);

  private readonly columnVisibility = signal<Record<string, boolean>>({});

  activeFilters: Partial<F> = {};
  ordering: string | undefined;

  /**
   * Initializes the list by subscribing to query parameters.
   * Call this in the child component's constructor.
   *
   * @param storageKey - The key used for saving/loading sort preferences in local storage.
   */
  protected initList(storageKey: string): void {
    this.route.queryParams.pipe(takeUntilDestroyed()).subscribe((params) => {
      const page = params['page'] ? Number(params['page']) : 1;
      const pageSize = params['page_size'] ? Number(params['page_size']) : 10;

      let ordering = params['ordering'];
      if (ordering === undefined && !Object.keys(params).includes('ordering')) {
        ordering = this.sortPrefs.load(storageKey);
      } else {
        if (ordering) {
          this.sortPrefs.save(storageKey, ordering);
        } else {
          this.sortPrefs.clear(storageKey);
        }
      }

      const activeFilters: Record<string, string | number | boolean | null | undefined> =
        Object.fromEntries(
          Object.entries(params).filter(([k]) => !['page', 'page_size', 'ordering'].includes(k))
        );

      this.page.set(page);
      this.pageSize.set(pageSize);
      this.ordering = ordering;
      this.activeFilters = activeFilters;

      this.load();
    });
  }

  /**
   * Abstract load method to be implemented by child components to fetch data.
   */
  abstract load(): void;

  /**
   * Updates the URL query parameters with the provided updates.
   */
  protected updateUrl(updates: Record<string, string | number | boolean | null | undefined>): void {
    const queryParams: Record<string, string | number | boolean | null | undefined> = {
      page: this.page() > 1 ? this.page() : null,
      page_size: this.pageSize() !== 10 ? this.pageSize() : null,
      ordering: this.ordering || null,
      search:
        (this.activeFilters as Record<string, string | number | boolean | null | undefined>)
          .search || null,
      ...updates,
    };

    for (const key in queryParams) {
      if (queryParams[key] === null) {
        queryParams[key] = null;
      }
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  onFiltersChange(filters: Partial<F>): void {
    this.updateUrl({ ...filters, page: null });
  }

  onPageChange(page: number): void {
    this.updateUrl({ page: page > 1 ? page : null });
  }

  onPageSizeChange(size: number): void {
    this.updateUrl({ page_size: size !== 10 ? size : null, page: null });
  }

  onSortChange(storageKey: string, column: string, order: NzTableSortOrder): void {
    let ordering: string | null = null;
    if (order) {
      const prefix = order === 'descend' ? '-' : '';
      ordering = `${prefix}${column}`;
    } else {
      this.sortPrefs.clear(storageKey);
    }
    this.updateUrl({ ordering, page: null });
  }

  getSortOrder(column: string): NzTableSortOrder {
    if (!this.ordering) return null;
    if (this.ordering === column) return 'ascend';
    if (this.ordering === `-${column}`) return 'descend';
    return null;
  }

  onColumnVisibilityChange(v: Record<string, boolean>): void {
    this.columnVisibility.set(v);
  }

  showCol(key: string): boolean {
    return this.columnVisibility()[key] !== false;
  }
}
