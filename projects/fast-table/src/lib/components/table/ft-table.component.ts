import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  signal,
  effect,
  inject,
  ElementRef,
  viewChild,
  OnInit,
  AfterViewInit,
  OnDestroy,
} from '@angular/core';
import { ColumnModel } from '../../core/column-model';
import { ValueService } from '../../core/value-service';
import { FilterService } from '../../core/filter-service';
import { ClientSideRowModel } from '../../core/client-side-row-model';
import { SelectionService } from '../../core/selection-service';
import { EditingService } from '../../core/editing-service';
import { ViewportModel } from '../../core/viewport-model';
import { ContextMenuService } from '../../core/context-menu-service';
import { PivotService } from '../../features/pivot/pivot-service';
import { FormulaService } from '../../features/formula/formula-service';
import {
  ChartComponent,
  type ChartData,
  type ChartType,
} from '../../features/charts/chart.component';
import { InfiniteLoader } from '../../features/row-models/infinite-loader';
import { CommentService } from '../../features/comments/comment-service';
import {
  AdvancedFilterBuilderComponent,
  createEmptyAdvancedFilterGroup,
} from '../../features/filtering/advanced-filter-builder.component';
import type { AdvancedFilterGroup } from '../../models/filter-model';
import { GridApi } from '../../core/grid-api';
import { FtHeaderComponent } from '../header/ft-header.component';
import { FtRowComponent } from '../row/ft-row.component';
import { StatusBarComponent } from '../status-bar/status-bar.component';
import { ToolbarComponent } from '../toolbar/toolbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { OverlayLoadingComponent, OverlayNoRowsComponent } from '../overlays/overlays.component';
import { PaginationBarComponent } from '../toolbar/pagination-bar.component';
import { ContextMenuComponent } from '../context-menu/context-menu.component';
import { NgComponentOutlet } from '@angular/common';
import type { GridOptions, MasterDetailConfig } from '../../models/grid-options';
import type { ColDef, ColumnGroupDef } from '../../models/column-def';
import { RowNode } from '../../models/row-node';

let gridInstanceCounter = 0;

@Component({
  selector: 'ft-table',
  standalone: true,
  imports: [
    FtHeaderComponent,
    FtRowComponent,
    StatusBarComponent,
    ToolbarComponent,
    SidebarComponent,
    OverlayLoadingComponent,
    OverlayNoRowsComponent,
    PaginationBarComponent,
    ContextMenuComponent,
    FtTableComponent,
    NgComponentOutlet,
    ChartComponent,
    AdvancedFilterBuilderComponent,
  ],
  providers: [
    ColumnModel,
    ValueService,
    FilterService,
    ClientSideRowModel,
    SelectionService,
    EditingService,
    ViewportModel,
    ContextMenuService,
    PivotService,
    FormulaService,
    InfiniteLoader,
    CommentService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ft-table.component.html',
  styleUrl: './ft-table.component.scss',
})
export class FtTableComponent<TData = any> implements OnInit, AfterViewInit, OnDestroy {
  readonly gridOptions = input<GridOptions<TData>>();
  readonly columnDefs = input<(ColDef<TData> | ColumnGroupDef<TData>)[]>();
  readonly rowData = input<TData[]>();
  readonly loading = input<boolean>(false);
  readonly showToolbar = input<boolean>(true);
  readonly rtl = computed(() => !!this.effectiveOptions().rtl);
  readonly alignedGrids = input<FtTableComponent<any>[]>([]);

  readonly gridReady = output<GridApi<TData>>();
  readonly cellValueChanged = output<{
    node: RowNode<TData>;
    colId: string;
    oldValue: unknown;
    newValue: unknown;
  }>();
  readonly selectionChanged = output<RowNode<TData>[]>();
  readonly sortChanged = output<void>();
  readonly rowClicked = output<RowNode<TData>>();
  readonly chartRequested = output<{
    ranges: { startRowIndex: number; endRowIndex: number; colIds: string[] }[];
  }>();

  readonly columnModel = inject(ColumnModel<TData>);
  readonly valueService = inject(ValueService<TData>);
  readonly filterService = inject(FilterService<TData>);
  readonly rowModel = inject(ClientSideRowModel<TData>);
  readonly selectionService = inject(SelectionService<TData>);
  readonly editingService = inject(EditingService<TData>);
  readonly viewportModel = inject(ViewportModel<TData>);
  readonly contextMenuService = inject(ContextMenuService<TData>);
  readonly pivotService = inject(PivotService<TData>);
  readonly infiniteLoader = inject(InfiniteLoader<TData>);

  readonly instanceId = `ft-grid-${gridInstanceCounter++}`;
  api!: GridApi<TData>;

  readonly viewportEl = viewChild<ElementRef<HTMLDivElement>>('viewportEl');
  readonly hscrollEl = viewChild<ElementRef<HTMLDivElement>>('hscrollEl');
  /** Width of .ft-viewport's vertical scrollbar, measured rather than assumed:
   *  `scrollbar-width: thin` overrides the ::-webkit-scrollbar size in modern
   *  browsers, and overlay scrollbars (macOS) take no space at all. The
   *  scrollbar row reserves the same gutter so its pinned-right filler lines
   *  up with the pinned-right cells above it. */
  readonly verticalScrollbarGutter = signal(0);

  readonly currentPage = signal(0);
  readonly pageSize = signal(100);
  readonly sidebarOpen = signal<'columns' | 'filters' | null>(null);
  readonly advancedFilterOpen = signal(false);
  readonly advancedFilterDraft = signal<AdvancedFilterGroup>(createEmptyAdvancedFilterGroup());
  masterDetailConfig: MasterDetailConfig<TData, any> | null = null;
  private detailDataCache = new Map<string, unknown[]>();
  private detailDataVersion = signal(0);

  // Temporary: enable with localStorage.setItem('ft-debug','1') + reload to see
  // live viewport/row/page measurements while tracking down the init-size bug.
  readonly showDebugOverlay =
    typeof window !== 'undefined' && window.localStorage?.getItem('ft-debug') === '1';

  private effectiveOptions = computed<GridOptions<TData>>(() => {
    const opts = this.gridOptions();
    if (opts) return opts;
    return { columnDefs: this.columnDefs() ?? [], rowData: this.rowData() ?? [] };
  });

  readonly allRows = computed(() => this.rowModel.displayedRows());

  readonly paginationEnabled = computed(() => !!this.effectiveOptions().pagination);

  readonly pagedRows = computed(() => {
    const all = this.allRows();
    if (!this.paginationEnabled()) return all;
    const size = this.pageSize();
    const start = this.currentPage() * size;
    return all.slice(start, start + size);
  });

  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil(this.allRows().length / this.pageSize())),
  );

  readonly rowLayout = computed(() => this.viewportModel.buildLayout(this.pagedRows()));
  readonly totalHeight = computed(() => this.viewportModel.totalHeight(this.rowLayout()));
  readonly visibleLayout = computed(() => this.viewportModel.visibleRowLayout(this.rowLayout()));

  readonly viewportWidthSig = signal(800);
  readonly centerColumns = computed(() => this.columnModel.center());
  readonly visibleCenterRange = computed(() =>
    this.viewportModel.visibleCenterColumns(this.centerColumns(), this.viewportWidthSig()),
  );
  /** Whether the center columns actually overflow the space available to
   *  them — the dedicated hscrollbar only needs to take up room (and only
   *  needs to exist at all) when there's something to scroll. */
  readonly hasHorizontalOverflow = computed(() => {
    const availableCenterWidth = Math.max(
      0,
      this.viewportWidthSig() - this.columnModel.leftTotalWidth() - this.columnModel.rightTotalWidth(),
    );
    return this.columnModel.centerTotalWidth() > availableCenterWidth;
  });

  readonly pinnedTopRows = computed(() => this.rowModel.pinnedTopNodes());
  readonly pinnedBottomRows = computed(() => this.rowModel.pinnedBottomNodes());

  readonly isEmpty = computed(
    () => this.allRows().length === 0 && !this.loading() && !this.infiniteLoader.loading(),
  );

  constructor() {
    this.rowModel.pivotAggregator = (node) => this.pivotService.computePivotAggregates(node);

    // Flex columns (colDef.flex) grow to fill whatever center-section space
    // is left over — recompute whenever the viewport is (re)measured or the
    // set of visible/pinned columns changes.
    effect(() => {
      const totalWidth = this.viewportWidthSig();
      const leftWidth = this.columnModel.leftTotalWidth();
      const rightWidth = this.columnModel.rightTotalWidth();
      // applyFlexSizing reads columnModel.center() internally, which is
      // enough on its own to track column add/remove/hide/pin/reorder.
      this.columnModel.applyFlexSizing(Math.max(0, totalWidth - leftWidth - rightWidth));
    });

    effect(() => {
      const opts = this.effectiveOptions();
      this.columnModel.pivotModeSig.set(!!opts.pivotMode);
    });
    // columnModel.pivotModeSig is the single source of truth (settable via
    // gridOptions.pivotMode or the toolbar toggle) — this keeps the row
    // model's aggregation stage in sync with it.
    effect(() => {
      this.rowModel.pivotMode.set(this.columnModel.pivotModeSig());
    });
    effect(() => {
      this.columnModel.pivotResultColumns.set(this.pivotService.pivotResultColumns());
    });
    // Aligned grids: mirror this grid's column widths onto every peer whenever
    // any of them change, so two independently-scrolled tables stay lined up.
    effect(() => {
      const widths = this.columnModel.columns().map((c) => `${c.colId}:${c.width()}`);
      for (const peer of this.alignedGrids()) {
        for (const w of widths) {
          const [colId, width] = w.split(':');
          peer.columnModel.setWidth(colId, Number(width));
        }
      }
    });
    effect(() => {
      const opts = this.effectiveOptions();
      this.columnModel.setColumnDefs(opts.columnDefs);
    });
    effect(() => {
      const opts = this.effectiveOptions();
      const usesLoader = opts.rowModelType === 'infinite' || opts.rowModelType === 'serverSide';
      if (!usesLoader && opts.rowData) {
        this.rowModel.setRowData(opts.rowData);
      } else if (usesLoader) {
        this.infiniteLoader.datasource = opts.datasource ?? null;
        this.infiniteLoader.serverSideDatasource = opts.serverSideDatasource ?? null;
        this.infiniteLoader.blockSize = opts.cacheBlockSize ?? 100;
        this.infiniteLoader.reset();
      }
    });
    effect(() => {
      const opts = this.effectiveOptions();
      this.rowModel.getRowId = opts.getRowId;
      this.rowModel.getDataPath = opts.getDataPath;
      this.rowModel.treeData.set(!!opts.treeData);
      this.rowModel.groupDefaultExpanded = opts.groupDefaultExpanded ?? 0;
      this.selectionService.mode =
        opts.rowSelection === 'single'
          ? 'single'
          : opts.rowSelection === 'none'
            ? 'none'
            : 'multiple';
      if (typeof opts.rowHeight === 'number') this.viewportModel.defaultRowHeight = opts.rowHeight;
      if (typeof opts.rowHeight === 'function') {
        const fn = opts.rowHeight;
        this.viewportModel.getRowHeightFn = (node) => fn({ data: node.data, node });
      }
      this.editingService.undoRedoEnabled = opts.undoRedoCellEditing ?? true;
      this.editingService.undoLimit = opts.undoRedoLimit ?? 100;
      this.pageSize.set(opts.paginationPageSize ?? 100);
      this.rowModel.masterDetailEnabled.set(!!opts.masterDetail);
      this.rowModel.detailRowHeight = opts.masterDetail?.detailRowHeight ?? 240;
      this.masterDetailConfig = opts.masterDetail ?? null;
    });

    effect((onCleanup) => {
      const unsub = this.editingService.onCellValueChanged((evt) => {
        this.cellValueChanged.emit(evt as any);
      });
      onCleanup(unsub);
    });

    effect(() => {
      this.selectionChanged.emit(this.selectionService.selectedNodes());
    });

    // Reactive to viewportEl() itself (not just read once in ngAfterViewInit):
    // confirmed via live debugging that a dev-server hot-reload can swap the
    // .ft-viewport DOM node without re-running lifecycle hooks, which left a
    // ResizeObserver/poll from a prior mount watching a detached element
    // forever while viewportHeight/viewportWidthSig stayed stuck at 0 (which
    // in turn made row/column virtualization windows collapse to a handful
    // of rows/cols, looking like "missing data"). Keying off the viewChild
    // signal means any future element swap re-attaches automatically. The
    // interval runs for the component's full lifetime (not just briefly
    // after mount) as a low-cost, self-terminating-on-destroy guarantee that
    // the measured size can never get permanently stuck again — two property
    // reads and a signal set that no-ops when unchanged is negligible at 2Hz.
    effect((onCleanup) => {
      const el = this.viewportEl()?.nativeElement;
      if (!el) return;
      const measure = () => {
        this.viewportModel.viewportHeight.set(el.clientHeight);
        this.viewportWidthSig.set(el.clientWidth);
        this.verticalScrollbarGutter.set(el.offsetWidth - el.clientWidth);
      };
      measure();
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(measure);
        rafIds.push(raf2);
      });
      const rafIds = [raf1];
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      document.addEventListener('visibilitychange', measure);
      const intervalId = window.setInterval(measure, 500);
      onCleanup(() => {
        for (const id of rafIds) cancelAnimationFrame(id);
        ro.disconnect();
        document.removeEventListener('visibilitychange', measure);
        window.clearInterval(intervalId);
      });
    });
  }

  ngOnInit(): void {
    this.api = new GridApi<TData>(
      this.columnModel,
      this.rowModel,
      this.filterService,
      this.selectionService,
      this.editingService,
      this.valueService,
    );
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.gridReady.emit(this.api));
    document.addEventListener('mousemove', this.onFillMouseMove);
    document.addEventListener('mouseup', this.onFillMouseUp);
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousemove', this.onFillMouseMove);
    document.removeEventListener('mouseup', this.onFillMouseUp);
  }

  private fillSourceRange: { startRowIndex: number; endRowIndex: number; colIds: string[] } | null =
    null;

  private onFillMouseMove = (event: MouseEvent): void => {
    if (!this.selectionService.fillHandleActive()) return;
    const el = this.viewportEl()?.nativeElement;
    if (!el) return;
    if (!this.fillSourceRange) {
      const ranges = this.selectionService.ranges();
      this.fillSourceRange = ranges[ranges.length - 1] ?? null;
      if (!this.fillSourceRange) return;
    }
    const rect = el.getBoundingClientRect();
    const y = event.clientY - rect.top + el.scrollTop;
    const layout = this.rowLayout();
    let targetRow = layout.findIndex((r) => y < r.top + r.height);
    if (targetRow === -1) targetRow = layout.length - 1;
    const source = this.fillSourceRange;
    const from = Math.min(source.startRowIndex, source.endRowIndex);
    const newEnd = targetRow < from ? targetRow : Math.max(targetRow, source.endRowIndex);
    const ranges = [...this.selectionService.ranges()];
    ranges[ranges.length - 1] = { ...source, startRowIndex: from, endRowIndex: newEnd };
    this.selectionService.ranges.set(ranges);
  };

  private onFillMouseUp = (): void => {
    this.selectionService.rangeDragging.set(false);
    if (!this.selectionService.fillHandleActive()) return;
    this.selectionService.fillHandleActive.set(false);
    const source = this.fillSourceRange;
    this.fillSourceRange = null;
    if (!source) return;

    const ranges = this.selectionService.ranges();
    const finalRange = ranges[ranges.length - 1];
    if (!finalRange) return;
    const srcFrom = Math.min(source.startRowIndex, source.endRowIndex);
    const srcTo = Math.max(source.startRowIndex, source.endRowIndex);
    const fullFrom = Math.min(finalRange.startRowIndex, finalRange.endRowIndex);
    const fullTo = Math.max(finalRange.startRowIndex, finalRange.endRowIndex);
    if (fullFrom === srcFrom && fullTo === srcTo) return;

    const rows = this.rowModel.displayedRows();
    const changes: { node: RowNode<TData>; colId: string; newValue: unknown }[] = [];

    for (const colId of finalRange.colIds) {
      const col = this.columnModel.getColumn(colId);
      if (!col) continue;
      const sourceValues: number[] = [];
      for (let r = srcFrom; r <= srcTo; r++) {
        const v = this.valueService.getValue(col, rows[r]);
        sourceValues.push(typeof v === 'number' ? v : NaN);
      }
      const patternLen = sourceValues.length;
      const isNumericSeries = patternLen > 0 && sourceValues.every((v) => !isNaN(v));
      // uniform step inferred from the first/last source value; a single-cell
      // source (patternLen 1) just repeats, matching a flat drag with no series
      const step =
        isNumericSeries && patternLen > 1
          ? (sourceValues[patternLen - 1] - sourceValues[0]) / (patternLen - 1)
          : 0;

      const targetRows: number[] = [];
      if (fullFrom < srcFrom) for (let r = fullFrom; r < srcFrom; r++) targetRows.push(r);
      if (fullTo > srcTo) for (let r = srcTo + 1; r <= fullTo; r++) targetRows.push(r);

      targetRows.forEach((r) => {
        const node = rows[r];
        if (!node || patternLen === 0) return;
        let newValue: unknown;
        if (isNumericSeries) {
          // linear extrapolation of the source series, signed by distance from its start
          newValue = sourceValues[0] + step * (r - srcFrom);
        } else {
          // non-numeric: cycle through the source pattern (Excel-style repeat-fill)
          const distance = r > srcTo ? r - srcTo : r - srcFrom;
          const patternIndex = ((distance % patternLen) + patternLen) % patternLen;
          newValue = this.valueService.getValue(col, rows[srcFrom + patternIndex]);
        }
        changes.push({ node, colId, newValue });
      });
    }
    this.editingService.commitBatch(changes, 'fill');
  };

  private syncingScroll = false;

  /** Vertical scroll only — horizontal lives on the separate .ft-hscrollbar
   *  (see onHScroll) so its native scrollbar only ever spans the center
   *  columns, not the pinned ones. */
  onScroll(event: Event): void {
    const el = event.target as HTMLDivElement;
    // Belt-and-braces: overflow-x:hidden normally makes this element's own
    // horizontal position immovable, but some input paths (e.g. certain
    // synthesized wheel/trackpad gestures) can still nudge scrollLeft before
    // a (wheel) handler gets a chance to intervene — redirect any such drift
    // to the dedicated hscrollbar instead of silently going out of sync.
    if (el.scrollLeft !== 0) {
      const hEl = this.hscrollEl()?.nativeElement;
      if (hEl) hEl.scrollLeft += el.scrollLeft;
      el.scrollLeft = 0;
    }
    this.viewportModel.scrollTop.set(el.scrollTop);
    if (this.infiniteLoader.datasource || this.infiniteLoader.serverSideDatasource) {
      this.infiniteLoader.maybeLoadMore(
        el.scrollTop,
        el.clientHeight,
        this.viewportModel.defaultRowHeight,
      );
    }
  }

  onHScroll(event: Event): void {
    const el = event.target as HTMLDivElement;
    this.viewportModel.scrollLeft.set(el.scrollLeft);
    if (!this.syncingScroll) {
      for (const peer of this.alignedGrids()) {
        const peerEl = peer.hscrollEl()?.nativeElement;
        if (peerEl && peerEl.scrollLeft !== el.scrollLeft) {
          peer.syncingScroll = true;
          peerEl.scrollLeft = el.scrollLeft;
          peer.syncingScroll = false;
        }
      }
    }
  }

  /** .ft-viewport no longer scrolls horizontally on its own (overflow-x:
   *  hidden), so trackpad/wheel horizontal input over the rows needs to be
   *  forwarded to the dedicated .ft-hscrollbar to keep working. */
  onWheel(event: WheelEvent): void {
    const dx = event.shiftKey && event.deltaX === 0 ? event.deltaY : event.deltaX;
    if (dx === 0) return;
    const hEl = this.hscrollEl()?.nativeElement;
    if (!hEl) return;
    hEl.scrollLeft += dx;
    event.preventDefault();
  }

  onRowClick(node: RowNode<TData>, event: MouseEvent): void {
    this.rowClicked.emit(node);
    if (this.selectionService.mode === 'none') return;
    const opts = this.effectiveOptions();
    if (opts.suppressRowClickSelection) return;
    this.selectionService.selectNode(node, {
      addToSelection: event.ctrlKey || event.metaKey,
      rangeFrom: event.shiftKey,
    });
  }

  rowClassFn = (node: RowNode<TData>): string => {
    const fn = this.effectiveOptions().rowClass;
    if (!fn) return '';
    if (typeof fn === 'function') {
      const r = fn({ data: node.data, node });
      return Array.isArray(r) ? r.join(' ') : (r ?? '');
    }
    return Array.isArray(fn) ? fn.join(' ') : fn;
  };

  goToPage(page: number): void {
    this.currentPage.set(Math.max(0, Math.min(this.pageCount() - 1, page)));
  }

  setPageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(0);
  }

  toggleSidebar(panel: 'columns' | 'filters'): void {
    this.sidebarOpen.set(this.sidebarOpen() === panel ? null : panel);
  }

  toggleAdvancedFilter(): void {
    this.advancedFilterOpen.set(!this.advancedFilterOpen());
  }

  applyAdvancedFilter(group: AdvancedFilterGroup): void {
    // The builder mutates its group tree in place (push/splice on nested
    // arrays), so the reference is unchanged across edits — clone before
    // .set() or a signal read with an unchanged reference is a silent no-op.
    this.filterService.advancedFilterModel.set(structuredClone(group));
  }

  clearAdvancedFilter(): void {
    this.advancedFilterDraft.set(createEmptyAdvancedFilterGroup());
    this.filterService.advancedFilterModel.set(null);
  }

  onContextMenuAction(action: string): void {
    const state = this.contextMenuService.state();
    this.contextMenuService.close();
    if (!state || action === 'close') return;
    const colId = state.colId;
    switch (action) {
      case 'copy':
        void this.api.copySelectedRangeToClipboard();
        break;
      case 'paste':
        void this.api.pasteFromClipboard();
        break;
      case 'editRow':
        this.editingService.startRowEdit(state.node);
        break;
      case 'sortAsc':
        this.columnModel.setSort(colId, 'asc');
        break;
      case 'sortDesc':
        this.columnModel.setSort(colId, 'desc');
        break;
      case 'clearSort':
        this.columnModel.setSort(colId, null);
        break;
      case 'pinLeft':
        this.columnModel.setPinned(colId, 'left');
        break;
      case 'pinRight':
        this.columnModel.setPinned(colId, 'right');
        break;
      case 'unpin':
        this.columnModel.setPinned(colId, null);
        break;
      case 'autosize':
        this.autoSizeColumnByContent(colId);
        break;
      case 'exportCsv':
        this.api.exportDataAsCsv();
        break;
      case 'chart':
        this.chartRequested.emit({ ranges: this.selectionService.ranges() });
        this.buildChartFromSelection();
        break;
    }
  }

  readonly chartData = signal<ChartData | null>(null);
  readonly chartType = signal<ChartType>('bar');

  private buildChartFromSelection(): void {
    const cells = this.selectionService.getRangeCells();
    if (cells.length === 0) return;
    const rowIndices = Array.from(new Set(cells.map((c) => c.rowIndex))).sort((a, b) => a - b);
    const colIds = Array.from(new Set(cells.map((c) => c.colId)));
    const cols = colIds.map((id) => this.columnModel.getColumn(id)).filter((c) => !!c);
    const rows = this.rowModel.displayedRows();

    const labelCol = cols[0];
    const seriesCols = cols.slice(1).filter((c) => c.colDef.type === 'number' || true);
    if (!labelCol) return;

    const categories = rowIndices.map((ri) => {
      const node = rows[ri];
      return node ? this.valueService.getFormattedValue(labelCol, node) : '';
    });

    const series = (seriesCols.length ? seriesCols : cols.slice(1)).map((col) => ({
      name: col.headerName(),
      values: rowIndices.map((ri) => {
        const node = rows[ri];
        const v = node ? this.valueService.getValue(col, node) : 0;
        return typeof v === 'number' ? v : Number(v) || 0;
      }),
    }));

    this.chartData.set({ categories, series });
  }

  closeChart(): void {
    this.chartData.set(null);
  }

  private autoSizeColumnByContent(colId: string): void {
    const col = this.columnModel.getColumn(colId);
    if (!col) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const font = '13px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
    if (ctx) ctx.font = font;
    const sample = this.rowModel.displayedRows().slice(0, 200);
    const widths = sample.map((n) => {
      const text = this.valueService.getFormattedValue(col, n);
      return ctx ? ctx.measureText(text).width : text.length * 7;
    });
    this.columnModel.autoSizeColumn(colId, widths);
  }

  // Keyboard navigation: arrows move/extend the active cell, Enter/F2 edit,
  // Escape cancels, Delete clears the selected range, and the usual
  // copy/paste/undo/redo/select-all shortcuts operate on the active range.
  onKeydown(event: KeyboardEvent): void {
    if (this.editingService.editingCell()) {
      return;
    }
    const cols = this.columnModel.visibleColumns();
    if (cols.length === 0) return;
    const rows = this.rowModel.displayedRows();
    const active = this.selectionService.activeCell();
    const mod = event.ctrlKey || event.metaKey;

    if (mod && event.key.toLowerCase() === 'c') {
      event.preventDefault();
      void this.api.copySelectedRangeToClipboard();
      return;
    }
    if (mod && event.key.toLowerCase() === 'v') {
      event.preventDefault();
      void this.api.pasteFromClipboard();
      return;
    }
    if (mod && event.key.toLowerCase() === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.editingService.undo();
      return;
    }
    if (
      mod &&
      (event.key.toLowerCase() === 'y' || (event.key.toLowerCase() === 'z' && event.shiftKey))
    ) {
      event.preventDefault();
      this.editingService.redo();
      return;
    }
    if (mod && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      this.selectionService.selectAll();
      if (rows.length && cols.length) {
        this.selectionService.ranges.set([
          { startRowIndex: 0, endRowIndex: rows.length - 1, colIds: cols.map((c) => c.colId) },
        ]);
      }
      return;
    }

    if (!active) {
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(event.key) &&
        rows.length
      ) {
        event.preventDefault();
        this.selectionService.startRange(0, cols[0].colId);
      }
      return;
    }

    const rowIndex =
      rows.findIndex((r) => r.rowIndex === active.rowIndex) !== -1 ? active.rowIndex : 0;
    const colIndex = cols.findIndex((c) => c.colId === active.colId);

    const moveTo = (r: number, c: number, extend: boolean): void => {
      const clampedR = Math.max(0, Math.min(rows.length - 1, r));
      const clampedC = Math.max(0, Math.min(cols.length - 1, c));
      const colId = cols[clampedC].colId;
      if (extend) {
        this.selectionService.extendRange(clampedR, colId);
      } else {
        this.selectionService.startRange(clampedR, colId);
      }
      this.scrollRowIntoView(clampedR);
    };

    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        moveTo(rowIndex - 1, colIndex, event.shiftKey);
        break;
      case 'ArrowDown':
        event.preventDefault();
        moveTo(rowIndex + 1, colIndex, event.shiftKey);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        moveTo(rowIndex, colIndex - 1, event.shiftKey);
        break;
      case 'ArrowRight':
      case 'Tab':
        event.preventDefault();
        moveTo(rowIndex, colIndex + 1, event.shiftKey);
        break;
      case 'Home':
        event.preventDefault();
        moveTo(rowIndex, 0, event.shiftKey);
        break;
      case 'End':
        event.preventDefault();
        moveTo(rowIndex, cols.length - 1, event.shiftKey);
        break;
      case 'PageDown':
        event.preventDefault();
        moveTo(rowIndex + 20, colIndex, event.shiftKey);
        break;
      case 'PageUp':
        event.preventDefault();
        moveTo(rowIndex - 20, colIndex, event.shiftKey);
        break;
      case 'Enter':
      case 'F2': {
        event.preventDefault();
        const node = rows[rowIndex];
        const col = cols[colIndex];
        if (
          node &&
          col &&
          col.isEditable({ data: node.data, node, colId: col.colId, api: this.api })
        ) {
          this.editingService.startEdit(node, col.colId);
        }
        break;
      }
      case 'Delete':
      case 'Backspace': {
        event.preventDefault();
        const changes = this.selectionService.getRangeCells().map((cell) => ({
          node: rows[cell.rowIndex],
          colId: cell.colId,
          newValue: '',
        }));
        this.editingService.commitBatch(changes.filter((c) => !!c.node) as any, 'fill');
        break;
      }
      case ' ': {
        const node = rows[rowIndex];
        if (node) {
          event.preventDefault();
          this.selectionService.selectNode(node, { addToSelection: true });
        }
        break;
      }
    }
  }

  isFullWidthRow(node: RowNode<TData>): boolean {
    if (node.isDetailRow || node.group) return false;
    const fn = this.effectiveOptions().isFullWidthRow;
    return fn ? fn({ data: node.data, node }) : false;
  }

  fullWidthRendererType(): any {
    return this.effectiveOptions().fullWidthRowRenderer ?? null;
  }

  fullWidthParams(node: RowNode<TData>): unknown {
    return { value: undefined, data: node.data, node, colDef: {}, api: this.api };
  }

  getDetailData(masterNode: RowNode<TData>): unknown[] {
    this.detailDataVersion();
    const cached = this.detailDataCache.get(masterNode.id);
    if (cached) return cached;
    if (!this.masterDetailConfig || masterNode.data === undefined) return [];
    const result = this.masterDetailConfig.getDetailRowData({ data: masterNode.data });
    if (result instanceof Promise) {
      this.detailDataCache.set(masterNode.id, []);
      result.then((rows) => {
        this.detailDataCache.set(masterNode.id, rows);
        this.detailDataVersion.update((v) => v + 1);
      });
      return [];
    }
    this.detailDataCache.set(masterNode.id, result);
    return result;
  }

  private scrollRowIntoView(rowIndex: number): void {
    const layout = this.rowLayout();
    const target = layout[rowIndex];
    const el = this.viewportEl()?.nativeElement;
    if (!target || !el) return;
    if (target.top < el.scrollTop) {
      el.scrollTop = target.top;
    } else if (target.top + target.height > el.scrollTop + el.clientHeight) {
      el.scrollTop = target.top + target.height - el.clientHeight;
    }
  }
}
