import { Component, computed, inject, input, output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { LANG_QUERY_PARAM, LANG_QUERY_PARAMS, UI_LANGUAGE } from '../../../core/i18n/ui-language';

export function parsePositivePageParam(raw: string | null | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

@Component({
  selector: 'app-crawlable-pagination',
  standalone: true,
  imports: [NzPaginationModule, NzIconModule],
  template: `
    <nz-pagination
      [nzPageIndex]="pageIndex()"
      [nzTotal]="total()"
      [nzPageSize]="pageSize()"
      [nzShowSizeChanger]="showSizeChanger()"
      [nzPageSizeOptions]="pageSizeOptions()"
      [nzShowQuickJumper]="showQuickJumper()"
      [nzItemRender]="paginationItem"
      (nzPageIndexChange)="pageIndexChange.emit($event)"
      (nzPageSizeChange)="pageSizeChange.emit($event)"
    />

    <ng-template #paginationItem let-type let-page="page">
      @switch (type) {
        @case ('page') {
          <a [attr.href]="pageHref(page)" (click)="onLinkClick($event)">{{ page }}</a>
        }
        @case ('prev') {
          @if (pageIndex() <= 1) {
            <button type="button" disabled class="ant-pagination-item-link">
              <nz-icon [nzType]="isRtl ? 'right' : 'left'" />
            </button>
          } @else {
            <a
              class="ant-pagination-item-link"
              [attr.href]="pageHref(pageIndex() - 1)"
              (click)="onLinkClick($event)"
            >
              <nz-icon [nzType]="isRtl ? 'right' : 'left'" />
            </a>
          }
        }
        @case ('next') {
          @if (pageIndex() >= lastPage()) {
            <button type="button" disabled class="ant-pagination-item-link">
              <nz-icon [nzType]="isRtl ? 'left' : 'right'" />
            </button>
          } @else {
            <a
              class="ant-pagination-item-link"
              [attr.href]="pageHref(pageIndex() + 1)"
              (click)="onLinkClick($event)"
            >
              <nz-icon [nzType]="isRtl ? 'left' : 'right'" />
            </a>
          }
        }
        @case ('prev_5') {
          <a
            class="ant-pagination-item-link"
            [attr.href]="pageHref(pageIndex() - 5)"
            (click)="onLinkClick($event)"
          >
            <div class="ant-pagination-item-container">
              <nz-icon
                [nzType]="isRtl ? 'double-right' : 'double-left'"
                class="ant-pagination-item-link-icon"
              />
              <span class="ant-pagination-item-ellipsis">•••</span>
            </div>
          </a>
        }
        @case ('next_5') {
          <a
            class="ant-pagination-item-link"
            [attr.href]="pageHref(pageIndex() + 5)"
            (click)="onLinkClick($event)"
          >
            <div class="ant-pagination-item-container">
              <nz-icon
                [nzType]="isRtl ? 'double-left' : 'double-right'"
                class="ant-pagination-item-link-icon"
              />
              <span class="ant-pagination-item-ellipsis">•••</span>
            </div>
          </a>
        }
      }
    </ng-template>
  `,
  styles: `
    a.ant-pagination-item-link {
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
    }
  `,
})
export class CrawlablePaginationComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly langParams = inject(LANG_QUERY_PARAMS);
  readonly isRtl = inject(UI_LANGUAGE) === 'ar';

  pageIndex = input.required<number>();
  total = input.required<number>();
  pageSize = input.required<number>();
  pageSizeOptions = input<number[]>([12, 24, 48]);
  showSizeChanger = input(true);
  showQuickJumper = input(true);

  pageIndexChange = output<number>();
  pageSizeChange = output<number>();

  readonly lastPage = computed(() =>
    Math.max(1, Math.ceil(this.total() / Math.max(1, this.pageSize())))
  );

  pageHref(targetPage: number): string {
    const clamped = Math.min(Math.max(1, targetPage), this.lastPage());
    const langOverrides = this.langParams ?? { [LANG_QUERY_PARAM]: null };
    const tree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: {
        ...langOverrides,
        page: clamped > 1 ? clamped : null,
      },
      queryParamsHandling: 'merge',
    });
    return this.router.serializeUrl(tree);
  }

  /**
   * A plain click stays in the SPA: the default navigation is cancelled and nz-pagination emits the
   * page change. A modified click (new tab/window) keeps the browser default but must not reach the
   * nz-pagination item, which would otherwise change the page in the current tab too.
   */
  onLinkClick(event: MouseEvent): void {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      event.stopPropagation();
      return;
    }
    event.preventDefault();
  }
}
