import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon } from '@ng-icons/core';
import { TranslateModule } from '@ngx-translate/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import {
  Observable,
  Subject,
  catchError,
  debounceTime,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
} from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { StateMessageComponent } from '../../../../../shared/components/state-message/state-message.component';
import {
  HierarchyLevel,
  HierarchyNode,
  HierarchyNodeRow,
  HierarchyRow,
  HierarchySearchResult,
  HierarchySurah,
} from '../../models/hierarchy.models';
import { HierarchyService } from '../../services/hierarchy.service';
import {
  HierarchyTreeNodeComponent,
  hierarchyIndent,
} from '../hierarchy-tree-node/hierarchy-tree-node.component';

/** Fixed row height shared by the virtual scroll strategy and the row styles. */
export const HIERARCHY_ROW_HEIGHT = 48;
export const HIERARCHY_SEARCH_DEBOUNCE_MS = 300;

type LoadState = 'loading' | 'loaded' | 'error';
type SearchState = 'idle' | 'loading' | 'loaded' | 'error';

type Branch =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; nodes: HierarchyNode[] };

export interface HierarchyCrumb {
  key: string;
  level: HierarchyLevel;
  labelKey: string;
  params: Record<string, string | number>;
}

interface SearchOutcome {
  results: HierarchySearchResult[];
  count: number;
}

@Component({
  selector: 'app-hierarchy-manager',
  standalone: true,
  imports: [
    ScrollingModule,
    NgIcon,
    TranslateModule,
    NzAlertModule,
    NzButtonModule,
    NzInputModule,
    NzSkeletonModule,
    NzSpinModule,
    StateMessageComponent,
    HierarchyTreeNodeComponent,
  ],
  templateUrl: './hierarchy-manager.component.html',
  styleUrl: './hierarchy-manager.component.less',
})
export class HierarchyManagerComponent implements OnInit {
  private readonly hierarchyService = inject(HierarchyService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  private readonly viewport = viewChild(CdkVirtualScrollViewport);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly rowHeight = HIERARCHY_ROW_HEIGHT;
  readonly usingMockData = environment.useHierarchyMockApi;

  readonly surahsState = signal<LoadState>('loading');
  readonly surahs = signal<HierarchySurah[]>([]);
  readonly activeKey = signal<string | null>(null);
  private readonly branches = signal<ReadonlyMap<string, Branch>>(new Map());
  private readonly expandedKeys = signal<ReadonlySet<string>>(new Set());
  private readonly inFlight = new Map<string, Observable<boolean>>();

  readonly searchQuery = signal('');
  readonly searchState = signal<SearchState>('idle');
  readonly searchResults = signal<HierarchySearchResult[]>([]);
  readonly searchTotal = signal(0);
  readonly activeResultIndex = signal(-1);
  readonly isSearching = computed(() => this.searchQuery().trim().length > 0);
  private readonly searchTerms = new Subject<string>();

  readonly totalAyahs = computed(() =>
    this.surahs().reduce((sum, surah) => sum + surah.ayahs_count, 0)
  );

  private readonly surahNodes = computed<HierarchyNode[]>(() =>
    this.surahs().map((surah) => ({
      level: 'surah',
      key: String(surah.surah_number),
      parentKey: null,
      data: surah,
    }))
  );

  /** Every node loaded so far, by key (surahs plus each cached branch). */
  private readonly nodesByKey = computed(() => {
    const index = new Map<string, HierarchyNode>();
    this.surahNodes().forEach((node) => index.set(node.key, node));
    this.branches().forEach((branch) => {
      if (branch.status === 'loaded') {
        branch.nodes.forEach((node) => index.set(node.key, node));
      }
    });
    return index;
  });

  /** The visible tree, flattened in display order for virtual scrolling and keyboard moves. */
  readonly rows = computed<HierarchyRow[]>(() => {
    const rows: HierarchyRow[] = [];
    this.appendRows(this.surahNodes(), 1, rows);
    return rows;
  });

  readonly activeIndex = computed(() => {
    const key = this.activeKey();
    return key === null
      ? -1
      : this.rows().findIndex((row) => row.kind === 'node' && row.node.key === key);
  });

  readonly activeRowId = computed(() => {
    const index = this.activeIndex();
    return index === -1 ? null : this.rows()[index].id;
  });

  /** Path from the surah down to the active node. */
  readonly breadcrumb = computed<HierarchyCrumb[]>(() => {
    const nodes = this.nodesByKey();
    const crumbs: HierarchyCrumb[] = [];
    const activeKey = this.activeKey();
    let node = activeKey === null ? undefined : nodes.get(activeKey);
    while (node) {
      crumbs.unshift(toCrumb(node));
      node = node.parentKey === null ? undefined : nodes.get(node.parentKey);
    }
    return crumbs;
  });

  readonly activeResultId = computed(() => {
    const index = this.activeResultIndex();
    return this.isSearching() && index !== -1 ? this.resultId(index) : null;
  });

  constructor() {
    this.searchTerms
      .pipe(
        debounceTime(HIERARCHY_SEARCH_DEBOUNCE_MS),
        switchMap((term) =>
          term
            ? this.hierarchyService.search(term).pipe(
                map((list): SearchOutcome | null => list),
                catchError(() => of(null))
              )
            : of({ results: [], count: 0 })
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((outcome) => this.applySearchOutcome(outcome));
  }

  ngOnInit(): void {
    this.loadSurahs();
  }

  loadSurahs(): void {
    this.surahsState.set('loading');
    this.hierarchyService
      .getSurahs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.surahs.set(list.results);
          this.surahsState.set('loaded');
        },
        error: () => this.surahsState.set('error'),
      });
  }

  onRowPick(row: HierarchyNodeRow): void {
    this.activeKey.set(row.node.key);
    if (row.expandable) {
      this.toggle(row);
    }
  }

  onTreeFocus(): void {
    if (this.activeIndex() === -1) {
      this.moveTo(this.findNodeRow(-1, 1));
    }
  }

  onTreeKeydown(event: KeyboardEvent): void {
    const current = this.activeIndex();
    let handled = true;
    switch (event.key) {
      case 'ArrowDown':
        this.moveTo(this.findNodeRow(current, 1));
        break;
      case 'ArrowUp':
        this.moveTo(current === -1 ? this.findNodeRow(-1, 1) : this.findNodeRow(current, -1));
        break;
      case 'Home':
        this.moveTo(this.findNodeRow(-1, 1));
        break;
      case 'End':
        this.moveTo(this.findNodeRow(this.rows().length, -1));
        break;
      case 'Enter': {
        const row = this.rows()[current];
        if (row?.kind === 'node' && row.expandable) {
          this.toggle(row);
        }
        break;
      }
      case 'Escape':
        handled = this.goUp();
        break;
      default:
        handled = false;
    }
    if (handled) {
      event.preventDefault();
    }
  }

  /** Root crumb: fold everything back to the surah list, keeping the current surah in view. */
  onRootCrumb(): void {
    const surahKey = this.breadcrumb()[0]?.key ?? null;
    this.expandedKeys.set(new Set());
    this.activeKey.set(surahKey);
    this.revealActive();
  }

  onCrumb(key: string): void {
    this.activeKey.set(key);
    this.revealActive();
  }

  retry(parentKey: string): void {
    const node = this.nodesByKey().get(parentKey);
    if (node) {
      this.ensureChildren(node).subscribe();
    }
  }

  onSearchInput(value: string): void {
    const term = value.trim();
    this.searchQuery.set(value);
    this.activeResultIndex.set(-1);
    this.searchState.set(term ? 'loading' : 'idle');
    if (!term) {
      this.searchResults.set([]);
      this.searchTotal.set(0);
    }
    this.searchTerms.next(term);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    const results = this.searchResults();
    const index = this.activeResultIndex();
    switch (event.key) {
      case 'ArrowDown':
        if (!this.isSearching()) {
          this.focusTree();
        } else if (results.length) {
          this.activeResultIndex.set(Math.min(results.length - 1, index + 1));
        }
        break;
      case 'ArrowUp':
        if (results.length) {
          this.activeResultIndex.set(Math.max(0, index - 1));
        }
        break;
      case 'Enter':
        if (index !== -1 && results[index]) {
          this.openResult(results[index]);
        }
        break;
      case 'Escape':
        if (!this.isSearching()) {
          return;
        }
        this.clearSearch();
        break;
      default:
        return;
    }
    event.preventDefault();
  }

  retrySearch(): void {
    this.onSearchInput(this.searchQuery());
  }

  clearSearch(): void {
    const input = this.searchInput()?.nativeElement;
    if (input) {
      input.value = '';
    }
    this.onSearchInput('');
  }

  /** Closes the search and opens the hit in the tree, loading the surah's ayahs if needed. */
  openResult(result: HierarchySearchResult): void {
    const surahNode = this.nodesByKey().get(String(result.surah_number));
    this.clearSearch();
    if (!surahNode) {
      return;
    }
    this.activeKey.set(surahNode.key);
    this.setExpanded(surahNode.key, true);
    this.revealActive();
    this.ensureChildren(surahNode).subscribe((loaded) => {
      if (loaded && result.ayah_key && this.nodesByKey().has(result.ayah_key)) {
        this.activeKey.set(result.ayah_key);
        this.revealActive();
      }
    });
  }

  resultId(index: number): string {
    return `hierarchy-result-${index}`;
  }

  resultKey(result: HierarchySearchResult): string {
    return result.ayah_key ?? `surah-${result.surah_number}`;
  }

  trackRow(_index: number, row: HierarchyRow): string {
    return row.id;
  }

  readonly indent = hierarchyIndent;

  private appendRows(nodes: HierarchyNode[], depth: number, rows: HierarchyRow[]): void {
    const expanded = this.expandedKeys();
    const branches = this.branches();
    nodes.forEach((node, index) => {
      const isExpanded = expanded.has(node.key);
      rows.push({
        kind: 'node',
        id: rowId(node.key),
        node,
        depth,
        posInSet: index + 1,
        setSize: nodes.length,
        expandable: isExpandable(node),
        expanded: isExpanded,
      });
      if (!isExpanded) {
        return;
      }
      const branch = branches.get(node.key);
      const childDepth = depth + 1;
      if (!branch || branch.status === 'loading') {
        rows.push(placeholder('loading', node.key, childDepth));
      } else if (branch.status === 'error') {
        rows.push(placeholder('error', node.key, childDepth));
      } else if (!branch.nodes.length) {
        rows.push(placeholder('empty', node.key, childDepth));
      } else {
        this.appendRows(branch.nodes, childDepth, rows);
      }
    });
  }

  private toggle(row: HierarchyNodeRow): void {
    if (row.expanded) {
      this.setExpanded(row.node.key, false);
      return;
    }
    this.setExpanded(row.node.key, true);
    this.ensureChildren(row.node).subscribe();
  }

  /** Escape: collapse the active node, else step up to its parent. */
  private goUp(): boolean {
    const row = this.rows()[this.activeIndex()];
    if (row?.kind !== 'node') {
      return false;
    }
    if (row.expanded) {
      this.setExpanded(row.node.key, false);
      return true;
    }
    if (row.node.parentKey !== null) {
      this.activeKey.set(row.node.parentKey);
      this.revealActive();
      return true;
    }
    return false;
  }

  /** Loads a node's children once; later calls reuse the cache or the request in flight. */
  private ensureChildren(node: HierarchyNode): Observable<boolean> {
    if (this.branches().get(node.key)?.status === 'loaded') {
      return of(true);
    }
    const pending = this.inFlight.get(node.key);
    if (pending) {
      return pending;
    }
    this.setBranch(node.key, { status: 'loading' });
    const request = this.fetchChildren(node).pipe(
      map((nodes) => {
        this.setBranch(node.key, { status: 'loaded', nodes });
        return true;
      }),
      catchError(() => {
        this.setBranch(node.key, { status: 'error' });
        return of(false);
      }),
      finalize(() => this.inFlight.delete(node.key)),
      takeUntilDestroyed(this.destroyRef),
      shareReplay(1)
    );
    this.inFlight.set(node.key, request);
    return request;
  }

  private fetchChildren(node: HierarchyNode): Observable<HierarchyNode[]> {
    switch (node.level) {
      case 'surah':
        return this.hierarchyService.getAyahs(node.data.surah_number).pipe(
          map((list) =>
            list.results.map(
              (data): HierarchyNode => ({
                level: 'ayah',
                key: data.ayah_key,
                parentKey: node.key,
                data,
              })
            )
          )
        );
      case 'ayah':
        return this.hierarchyService.getWords(node.key).pipe(
          map((list) =>
            list.results.map(
              (data): HierarchyNode => ({
                level: 'word',
                key: data.word_key,
                parentKey: node.key,
                data,
              })
            )
          )
        );
      case 'word':
        return this.hierarchyService.getLetters(node.key).pipe(
          map((list) =>
            list.results.map(
              (data): HierarchyNode => ({
                level: 'letter',
                key: data.letter_key,
                parentKey: node.key,
                data,
              })
            )
          )
        );
      case 'letter':
        return of([]);
    }
  }

  private setBranch(key: string, branch: Branch): void {
    this.branches.update((current) => new Map(current).set(key, branch));
  }

  private setExpanded(key: string, expanded: boolean): void {
    this.expandedKeys.update((current) => {
      const next = new Set(current);
      if (expanded) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }

  private findNodeRow(from: number, step: 1 | -1): number {
    const rows = this.rows();
    for (let index = from + step; index >= 0 && index < rows.length; index += step) {
      if (rows[index].kind === 'node') {
        return index;
      }
    }
    return -1;
  }

  private moveTo(index: number): void {
    const row = this.rows()[index];
    if (row?.kind !== 'node') {
      return;
    }
    this.activeKey.set(row.node.key);
    this.scrollToRow(index);
  }

  /** After the tree re-renders (it may have been hidden by the search), bring the active row into view and focus the tree. */
  private revealActive(): void {
    afterNextRender(
      () => {
        this.viewport()?.checkViewportSize();
        if (this.activeIndex() !== -1) {
          this.scrollToRow(this.activeIndex());
        }
        this.focusTree();
      },
      { injector: this.injector }
    );
  }

  private scrollToRow(index: number): void {
    const viewport = this.viewport();
    if (!viewport) {
      return;
    }
    const top = index * HIERARCHY_ROW_HEIGHT;
    const bottom = top + HIERARCHY_ROW_HEIGHT;
    const offset = viewport.measureScrollOffset('top');
    const size = viewport.getViewportSize();
    if (top < offset) {
      viewport.scrollToOffset(top);
    } else if (bottom > offset + size) {
      viewport.scrollToOffset(bottom - size);
    }
  }

  private focusTree(): void {
    this.viewport()?.elementRef.nativeElement.focus();
  }

  private applySearchOutcome(outcome: SearchOutcome | null): void {
    if (!this.isSearching()) {
      return;
    }
    if (!outcome) {
      this.searchState.set('error');
      return;
    }
    this.searchResults.set(outcome.results);
    this.searchTotal.set(outcome.count);
    this.activeResultIndex.set(outcome.results.length ? 0 : -1);
    this.searchState.set('loaded');
  }
}

function rowId(key: string): string {
  return `hierarchy-node-${key.replace(/:/g, '-')}`;
}

function placeholder(
  kind: 'loading' | 'empty' | 'error',
  parentKey: string,
  depth: number
): HierarchyRow {
  return { kind, id: `hierarchy-${kind}-${parentKey.replace(/:/g, '-')}`, parentKey, depth };
}

function isExpandable(node: HierarchyNode): boolean {
  switch (node.level) {
    case 'surah':
      return node.data.ayahs_count > 0;
    case 'ayah':
      return node.data.words_count > 0;
    case 'word':
      return node.data.letters_count > 0;
    case 'letter':
      return false;
  }
}

function toCrumb(node: HierarchyNode): HierarchyCrumb {
  switch (node.level) {
    case 'surah':
      return {
        key: node.key,
        level: node.level,
        labelKey: 'ADMIN.HIERARCHY.CRUMB_SURAH',
        params: { number: node.data.surah_number, name: node.data.name_ar },
      };
    case 'ayah':
      return {
        key: node.key,
        level: node.level,
        labelKey: 'ADMIN.HIERARCHY.CRUMB_AYAH',
        params: { number: node.data.ayah_number },
      };
    case 'word':
      return {
        key: node.key,
        level: node.level,
        labelKey: 'ADMIN.HIERARCHY.CRUMB_WORD',
        params: { number: node.data.position, text: node.data.text },
      };
    case 'letter':
      return {
        key: node.key,
        level: node.level,
        labelKey: 'ADMIN.HIERARCHY.CRUMB_LETTER',
        params: { number: node.data.position, text: node.data.text },
      };
  }
}
