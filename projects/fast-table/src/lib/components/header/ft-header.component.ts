import {
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Column } from '../../core/column';
import { ColumnModel } from '../../core/column-model';
import { SelectionService } from '../../core/selection-service';
import { ClientSideRowModel } from '../../core/client-side-row-model';
import { ValueService } from '../../core/value-service';
import { FilterService } from '../../core/filter-service';
import { ViewportModel } from '../../core/viewport-model';
import { FloatingFilterComponent } from '../../features/filtering/floating-filter.component';
import { FilterPopoverComponent } from '../../features/filtering/filter-popover.component';
import { isColumnGroupDef, type ColumnGroupDef, type ColDef } from '../../models/column-def';
import { FtIconComponent } from '../icon/ft-icon.component';

const COLUMN_MOVE_ANIMATION = 'ft-column-move';

interface HeaderGroupCell {
  key: string;
  headerName: string;
  columns: Column[];
  span: number;
}

@Component({
  selector: 'ft-header',
  standalone: true,
  imports: [FloatingFilterComponent, FilterPopoverComponent, FtIconComponent, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ft-header">
      @if (showGroupRow()) {
        <div class="ft-header-row ft-header-group-row">
          @if (leftCols().length) {
            <div class="ft-header-section ft-header-pinned-left" [style.width.px]="leftWidth()">
              @for (g of leftGroupRow(); track g.key) {
                <div
                  class="ft-header-group-cell"
                  [style.width.px]="groupWidth(g)"
                >
                  {{ g.headerName }}
                </div>
              }
            </div>
          }
          <div class="ft-header-center-clip">
            <div
              class="ft-header-center-inner"
              [style.width.px]="centerTotalWidth()"
              [style.transform]="'translateX(' + -scrollLeft() + 'px)'"
            >
              @for (g of centerGroupRow(); track g.key) {
                <div
                  class="ft-header-group-cell"
                  [style.width.px]="groupWidth(g)"
                >
                  {{ g.headerName }}
                </div>
              }
            </div>
          </div>
          @if (rightCols().length) {
            <div class="ft-header-section ft-header-pinned-right" [style.width.px]="rightWidth()">
              @for (g of rightGroupRow(); track g.key) {
                <div
                  class="ft-header-group-cell"
                  [style.width.px]="groupWidth(g)"
                >
                  {{ g.headerName }}
                </div>
              }
            </div>
          }
        </div>
      }

      <div class="ft-header-row ft-header-columns-row">
        @if (leftCols().length) {
          <div
            class="ft-header-section ft-header-pinned-left"
            data-section="left"
            [style.width.px]="leftWidth()"
          >
            @for (col of leftCols(); track col.colId) {
              <ng-container [ngTemplateOutlet]="headerCellTpl" [ngTemplateOutletContext]="{ $implicit: col }" />
            }
          </div>
        }
        <div class="ft-header-center-clip">
          <div
            class="ft-header-center-inner"
            data-section="center"
            [style.width.px]="centerTotalWidth()"
            [style.transform]="'translateX(' + -scrollLeft() + 'px)'"
          >
            @for (col of centerCols(); track col.colId) {
              <ng-container [ngTemplateOutlet]="headerCellTpl" [ngTemplateOutletContext]="{ $implicit: col }" />
            }
          </div>
        </div>
        @if (rightCols().length) {
          <div
            class="ft-header-section ft-header-pinned-right"
            data-section="right"
            [style.width.px]="rightWidth()"
          >
            @for (col of rightCols(); track col.colId) {
              <ng-container [ngTemplateOutlet]="headerCellTpl" [ngTemplateOutletContext]="{ $implicit: col }" />
            }
          </div>
        }
      </div>

      @if (hasFloatingFilters()) {
        <div class="ft-header-row ft-floating-filter-row">
          @if (leftCols().length) {
            <div class="ft-header-section ft-header-pinned-left" [style.width.px]="leftWidth()">
              @for (col of leftCols(); track col.colId) {
                <ng-container [ngTemplateOutlet]="floatingFilterTpl" [ngTemplateOutletContext]="{ $implicit: col }" />
              }
            </div>
          }
          <div class="ft-header-center-clip">
            <div
              class="ft-header-center-inner"
              [style.width.px]="centerTotalWidth()"
              [style.transform]="'translateX(' + -scrollLeft() + 'px)'"
            >
              @for (col of centerCols(); track col.colId) {
                <ng-container [ngTemplateOutlet]="floatingFilterTpl" [ngTemplateOutletContext]="{ $implicit: col }" />
              }
            </div>
          </div>
          @if (rightCols().length) {
            <div class="ft-header-section ft-header-pinned-right" [style.width.px]="rightWidth()">
              @for (col of rightCols(); track col.colId) {
                <ng-container [ngTemplateOutlet]="floatingFilterTpl" [ngTemplateOutletContext]="{ $implicit: col }" />
              }
            </div>
          }
        </div>
      }
    </div>

    <ng-template #headerCellTpl let-col>
      <div
        class="ft-header-cell"
        role="columnheader"
        [attr.aria-sort]="
          col.sort() === 'asc' ? 'ascending' : col.sort() === 'desc' ? 'descending' : 'none'
        "
        [style.width.px]="col.width()"
        [class]="headerClassOf(col)"
        [class.ft-resizing]="resizingColId() === col.colId"
        [class.ft-header-sorted]="!!col.sort()"
        [class.ft-col-drag-placeholder]="draggingColId() === col.colId"
        [attr.data-col-id]="col.colId"
        draggable="true"
        (dragstart)="onDragStart($event, col)"
      >
        @if (col.colDef.headerCheckboxSelection) {
          <input
            type="checkbox"
            class="ft-header-checkbox"
            [checked]="allSelected()"
            (change)="toggleSelectAll()"
          />
        }
        <span class="ft-header-label" (click)="onSortClick($event, col)">{{
          col.headerName()
        }}</span>
        @if (col.sort(); as dir) {
          <span class="ft-sort-indicator" [class.ft-sort-desc]="dir === 'desc'">
            <ft-icon name="chevron-up" />
            @if (showSortIndex(col)) {
              <sub>{{ col.sortIndex()! + 1 }}</sub>
            }
          </span>
        }
        @if (col.isFilterable()) {
          <button
            class="ft-filter-icon"
            [class.active]="hasActiveFilter(col)"
            (click)="toggleFilterPopover($event, col.colId)"
          >
            <ft-icon name="filter" />
          </button>
        }
        <span class="ft-pin-controls">
          <button
            class="ft-pin-btn"
            [class.active]="col.pinned() === 'left'"
            title="Fastfrys til venstre"
            (click)="pin(col, 'left')"
          >
            <ft-icon name="chevrons-left" />
          </button>
          <button class="ft-pin-btn" title="Frigør" (click)="pin(col, null)">
            <ft-icon name="pin-off" />
          </button>
          <button
            class="ft-pin-btn"
            [class.active]="col.pinned() === 'right'"
            title="Fastfrys til højre"
            (click)="pin(col, 'right')"
          >
            <ft-icon name="chevrons-right" />
          </button>
        </span>
        @if (col.isResizable()) {
          <div
            class="ft-resize-handle"
            (mousedown)="onResizeStart($event, col)"
            (dblclick)="onAutoSizeColumn($event, col)"
          ></div>
        }
        @if (openFilterColId() === col.colId) {
          <div class="ft-filter-popover-anchor">
            <ft-filter-popover [column]="col" (closed)="openFilterColId.set(null)" />
          </div>
        }
      </div>
    </ng-template>

    <ng-template #floatingFilterTpl let-col>
      <div
        class="ft-floating-filter-cell"
        [class.ft-col-drag-placeholder]="draggingColId() === col.colId"
        [attr.data-col-id]="col.colId"
        [style.width.px]="col.width()"
      >
        @if (col.colDef.floatingFilter && col.isFilterable()) {
          <ft-floating-filter [column]="col" />
        }
      </div>
    </ng-template>
  `,
})
export class FtHeaderComponent<TData = any> {
  columnModel = inject(ColumnModel<TData>);
  private selectionService = inject(SelectionService<TData>);
  private rowModel = inject(ClientSideRowModel<TData>);
  private valueService = inject(ValueService<TData>);
  private filterService = inject(FilterService<TData>);
  private viewportModel = inject(ViewportModel<TData>);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private injector = inject(Injector);

  hasActiveFilter(col: Column<TData>): boolean {
    return !!this.filterService.filterModel()[col.colId];
  }

  readonly openFilterColId = signal<string | null>(null);
  readonly resizingColId = signal<string | null>(null);
  readonly draggingColId = this.columnModel.draggingColId;
  /** Active header drag: the column order is reordered *live* while the
   *  pointer moves so the real grid previews the drop, and restored from
   *  `originalOrder` if the drag is cancelled (Esc / released outside). */
  private dragSession: { colId: string; originalOrder: string[] } | null = null;
  private resizing: { col: Column<TData>; startX: number; startWidth: number } | null = null;

  readonly leftCols = computed(() => this.columnModel.leftPinned());
  readonly rightCols = computed(() => this.columnModel.rightPinned());
  readonly centerCols = computed(() => this.columnModel.center());
  readonly leftWidth = computed(() => this.columnModel.leftTotalWidth());
  readonly rightWidth = computed(() => this.columnModel.rightTotalWidth());
  readonly centerTotalWidth = computed(() => this.columnModel.centerTotalWidth());
  readonly scrollLeft = computed(() => this.viewportModel.scrollLeft());

  readonly orderedVisibleColumns = computed(() => this.columnModel.visibleColumns());
  readonly hasFloatingFilters = computed(() =>
    this.orderedVisibleColumns().some((c) => c.colDef.floatingFilter),
  );

  readonly allSelected = computed(() => {
    const total = this.rowModel.displayedRows().length;
    return total > 0 && this.selectionService.selectedCount() === total;
  });

  /** colId -> which top-level column group (if any) it belongs to, derived
   *  from the original nested columnDefs — used to merge contiguous same-group
   *  runs in the *actual displayed* column order (see buildGroupRow). */
  private readonly groupInfoByColId = computed(() => {
    const map = new Map<string, { groupId: string; headerName: string }>();
    for (const def of this.columnModel.groupDefs) {
      if (!isColumnGroupDef(def)) continue;
      for (const child of this.flattenGroupCols(def)) {
        const colId = child.colId ?? child.field ?? '';
        if (colId) map.set(colId, { groupId: def.groupId, headerName: def.headerName });
      }
    }
    return map;
  });

  /** Changes whenever a column changes slot — reorder, pin, show/hide — but
   *  not on width or scroll changes, so only real moves get animated. */
  private readonly columnLayoutKey = computed(() =>
    [this.leftCols(), this.centerCols(), this.rightCols()]
      .map((section) => section.map((c) => c.colId).join(','))
      .join('|'),
  );

  constructor() {
    let previousKey: string | undefined;
    // Component effects run before this component's template is refreshed,
    // so the header cells still sit in their *old* slots here — that is the
    // "First" of a FLIP animation. The "Last" is read after the next render.
    effect(() => {
      const key = this.columnLayoutKey();
      if (previousKey === undefined || previousKey === key) {
        previousKey = key;
        return;
      }
      previousKey = key;
      const first = this.measureHeaderCellLefts();
      afterNextRender({ read: () => this.playColumnMoveAnimation(first) }, { injector: this.injector });
    });

    inject(DestroyRef).onDestroy(() => this.endDrag());
  }

  readonly showGroupRow = computed(() => this.columnModel.groupDefs.some(isColumnGroupDef));

  /** Builds one group-header cell per contiguous run of columns sharing the
   *  same group (in the column's *current displayed* order — after drag
   *  reorder/pinning, not the static columnDefs order), plus a blank filler
   *  cell of that column's width for every standalone column, so the row
   *  always has exactly one cell per displayed column and lines up with the
   *  header cells underneath regardless of grouping/order. */
  private buildGroupRow(cols: Column<TData>[]): HeaderGroupCell[] {
    const infoMap = this.groupInfoByColId();
    const cells: HeaderGroupCell[] = [];
    let i = 0;
    while (i < cols.length) {
      const info = infoMap.get(cols[i].colId);
      let j = i + 1;
      if (info) {
        while (j < cols.length && infoMap.get(cols[j].colId)?.groupId === info.groupId) j++;
      }
      const slice = cols.slice(i, j);
      cells.push({
        key: info ? `${info.groupId}:${i}` : `empty-${cols[i].colId}`,
        headerName: info?.headerName ?? '',
        columns: slice,
        span: slice.length,
      });
      i = j;
    }
    return cells;
  }

  readonly leftGroupRow = computed(() => this.buildGroupRow(this.leftCols()));
  readonly centerGroupRow = computed(() => this.buildGroupRow(this.centerCols()));
  readonly rightGroupRow = computed(() => this.buildGroupRow(this.rightCols()));

  private flattenGroupCols(def: ColumnGroupDef<TData>): ColDef<TData>[] {
    const out: ColDef<TData>[] = [];
    for (const child of def.children) {
      if (isColumnGroupDef(child)) out.push(...this.flattenGroupCols(child));
      else out.push(child);
    }
    return out;
  }

  groupWidth(g: HeaderGroupCell): number {
    return g.columns.reduce((sum, c) => sum + c.width(), 0);
  }

  headerClassOf(col: Column<TData>): string {
    const cls = col.colDef.headerClass;
    if (!cls) return '';
    return Array.isArray(cls) ? cls.join(' ') : cls;
  }

  showSortIndex(col: Column<TData>): boolean {
    return this.columnModel.activeSorts().length > 1 && col.sortIndex() !== null;
  }

  onSortClick(event: MouseEvent, col: Column<TData>): void {
    if (!col.isSortable()) return;
    const multi = event.shiftKey;
    const current = col.sort();
    const next = current === null ? 'asc' : current === 'asc' ? 'desc' : null;
    this.columnModel.setSort(col.colId, next, multi);
  }

  toggleFilterPopover(event: MouseEvent, colId: string): void {
    event.stopPropagation();
    this.openFilterColId.set(this.openFilterColId() === colId ? null : colId);
  }

  toggleSelectAll(): void {
    if (this.allSelected()) this.selectionService.deselectAll();
    else this.selectionService.selectAll();
  }

  pin(col: Column<TData>, side: 'left' | 'right' | null): void {
    this.columnModel.setPinned(col.colId, side);
  }

  onDragStart(event: DragEvent, col: Column<TData>): void {
    const cell = event.currentTarget as HTMLElement;
    // A nested drag (e.g. selected text in the filter popover) isn't a column move.
    if (event.target !== cell) return;
    this.endDrag();
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', col.colId);
      const rect = cell.getBoundingClientRect();
      event.dataTransfer.setDragImage(cell, event.clientX - rect.left, event.clientY - rect.top);
    }
    this.dragSession = {
      colId: col.colId,
      originalOrder: this.columnModel.columns().map((c) => c.colId),
    };
    // The drag source can be moved around the DOM by the live reorder, so
    // listen at the document level rather than on individual header cells.
    document.addEventListener('dragenter', this.onDocumentDragEnter, true);
    document.addEventListener('dragover', this.onDocumentDragOver, true);
    document.addEventListener('drop', this.onDocumentDrop, true);
    document.addEventListener('dragend', this.onDocumentDragEnd, true);
    // Defer the placeholder styling until the browser has snapshotted the
    // drag image, so the ghost under the cursor shows the real header.
    setTimeout(() => {
      if (this.dragSession?.colId === col.colId) this.draggingColId.set(col.colId);
    });
  }

  // Both dragenter and dragover must be cancelled for the grid to count as
  // a drop target — otherwise the browser never fires `drop`.
  private onDocumentDragEnter = (event: DragEvent): void => {
    if (this.dragSession && this.isInsideGrid(event.target)) event.preventDefault();
  };

  private onDocumentDragOver = (event: DragEvent): void => {
    if (!this.dragSession || !this.isInsideGrid(event.target)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.previewColumnMove(event.clientX);
  };

  private onDocumentDrop = (event: DragEvent): void => {
    if (!this.dragSession || !this.isInsideGrid(event.target)) return;
    event.preventDefault();
    // The column is already in its previewed slot — dropping just keeps it.
    this.endDrag();
  };

  private onDocumentDragEnd = (): void => {
    // Reaching dragend with a live session means no drop happened inside
    // the grid (Esc, or released elsewhere): put every column back.
    if (this.dragSession) this.columnModel.setColumnOrder(this.dragSession.originalOrder);
    this.endDrag();
  };

  private endDrag(): void {
    this.dragSession = null;
    this.draggingColId.set(null);
    document.removeEventListener('dragenter', this.onDocumentDragEnter, true);
    document.removeEventListener('dragover', this.onDocumentDragOver, true);
    document.removeEventListener('drop', this.onDocumentDrop, true);
    document.removeEventListener('dragend', this.onDocumentDragEnd, true);
  }

  private isInsideGrid(target: EventTarget | null): boolean {
    const hostEl = this.host.nativeElement;
    const region = hostEl.closest('.ft-grid-scroll-region') ?? hostEl;
    return target instanceof Node && region.contains(target);
  }

  /** Moves the dragged column to the slot under `clientX` within its own
   *  (pinned/center) section. Uses the section's model widths rather than
   *  the cells' rects, so cells still mid-animation can't make it jitter. */
  private previewColumnMove(clientX: number): void {
    const colId = this.dragSession!.colId;
    const dragged = this.columnModel.getColumn(colId);
    if (!dragged) return;
    const pinned = dragged.pinned();
    const section = pinned === 'left' ? 'left' : pinned === 'right' ? 'right' : 'center';
    const cols =
      section === 'left' ? this.leftCols() : section === 'right' ? this.rightCols() : this.centerCols();
    const container = this.host.nativeElement.querySelector<HTMLElement>(
      `.ft-header-columns-row [data-section="${section}"]`,
    );
    if (!container || cols.length < 2) return;

    const rect = container.getBoundingClientRect();
    const rtl = getComputedStyle(container).direction === 'rtl';
    const x = rtl ? rect.right - clientX : clientX - rect.left;
    let left = 0;
    for (let i = 0; i < cols.length; i++) {
      const width = cols[i].width();
      if (x < left + width || i === cols.length - 1) {
        const target = cols[i];
        if (target.colId === colId) return;
        const position = x < left + width / 2 ? 'before' : 'after';
        this.columnModel.moveColumnNextTo(colId, target.colId, position);
        return;
      }
      left += width;
    }
  }

  private measureHeaderCellLefts(): Map<string, number> {
    const lefts = new Map<string, number>();
    for (const el of this.headerCells()) {
      lefts.set(el.dataset['colId']!, el.getBoundingClientRect().left);
    }
    return lefts;
  }

  private headerCells(): HTMLElement[] {
    return Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>(
        '.ft-header-columns-row .ft-header-cell[data-col-id]',
      ),
    );
  }

  /** FLIP: every header, floating-filter and body cell of a column that
   *  changed slot starts at its old x and glides to the new one on the
   *  grid's spring curve. Columns that just appeared fade in instead. */
  private playColumnMoveAnimation(first: Map<string, number>): void {
    const hostEl = this.host.nativeElement;
    const root = hostEl.closest<HTMLElement>('.ft-root') ?? hostEl;
    if (typeof root.animate !== 'function') return;

    const byColId = new Map<string, HTMLElement[]>();
    for (const el of Array.from(root.querySelectorAll<HTMLElement>('[data-col-id]'))) {
      // Skip cells of nested (master/detail) grids.
      if ((el.closest('.ft-root') ?? hostEl) !== root) continue;
      for (const anim of el.getAnimations()) if (anim.id === COLUMN_MOVE_ANIMATION) anim.cancel();
      const colId = el.dataset['colId']!;
      const list = byColId.get(colId);
      if (list) list.push(el);
      else byColId.set(colId, [el]);
    }

    const timing = this.columnMoveTiming();
    for (const cell of this.headerCells()) {
      const colId = cell.dataset['colId']!;
      const els = byColId.get(colId) ?? [];
      const from = first.get(colId);
      let keyframes: Keyframe[];
      if (from === undefined) {
        keyframes = [{ opacity: 0 }, { opacity: 1 }];
      } else {
        const dx = from - cell.getBoundingClientRect().left;
        if (Math.abs(dx) < 0.5) continue;
        keyframes = [{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }];
      }
      for (const el of els) el.animate(keyframes, timing).id = COLUMN_MOVE_ANIMATION;
    }
  }

  private columnMoveTiming(): KeyframeAnimationOptions {
    const style = getComputedStyle(this.host.nativeElement);
    const rawDuration = style.getPropertyValue('--ft-duration-snappy').trim();
    const parsed = parseFloat(rawDuration);
    const duration = isNaN(parsed) ? 300 : rawDuration.endsWith('ms') ? parsed : parsed * 1000;
    const rawEasing = style.getPropertyValue('--ft-ease-snappy').trim();
    const easing =
      rawEasing && CSS.supports?.('animation-timing-function', rawEasing) ? rawEasing : 'ease-out';
    return { duration, easing };
  }

  onResizeStart(event: MouseEvent, col: Column<TData>): void {
    event.preventDefault();
    event.stopPropagation();
    this.resizing = { col, startX: event.clientX, startWidth: col.width() };
    this.resizingColId.set(col.colId);
    document.addEventListener('mousemove', this.onResizeMove);
    document.addEventListener('mouseup', this.onResizeEnd);
  }

  private onResizeMove = (event: MouseEvent): void => {
    if (!this.resizing) return;
    const delta = event.clientX - this.resizing.startX;
    this.columnModel.setWidth(this.resizing.col.colId, this.resizing.startWidth + delta);
  };

  private onResizeEnd = (): void => {
    this.resizing = null;
    this.resizingColId.set(null);
    document.removeEventListener('mousemove', this.onResizeMove);
    document.removeEventListener('mouseup', this.onResizeEnd);
  };

  onAutoSizeColumn(event: MouseEvent, col: Column<TData>): void {
    event.preventDefault();
    event.stopPropagation();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.font = '13px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
    const sample = this.rowModel.displayedRows().slice(0, 300);
    const widths = sample.map((n) => {
      const text = this.valueService.getFormattedValue(col, n);
      return ctx ? ctx.measureText(text).width : text.length * 7;
    });
    this.columnModel.autoSizeColumn(col.colId, widths);
  }
}
