import {
  Component,
  ChangeDetectionStrategy,
  computed,
  inject,
  signal,
  HostListener,
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
                  [class.ft-header-group-cell-empty]="!g.headerName"
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
                  [class.ft-header-group-cell-empty]="!g.headerName"
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
                  [class.ft-header-group-cell-empty]="!g.headerName"
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
          <div class="ft-header-section ft-header-pinned-left" [style.width.px]="leftWidth()">
            @for (col of leftCols(); track col.colId) {
              <ng-container [ngTemplateOutlet]="headerCellTpl" [ngTemplateOutletContext]="{ $implicit: col }" />
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
              <ng-container [ngTemplateOutlet]="headerCellTpl" [ngTemplateOutletContext]="{ $implicit: col }" />
            }
          </div>
        </div>
        @if (rightCols().length) {
          <div class="ft-header-section ft-header-pinned-right" [style.width.px]="rightWidth()">
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
        draggable="true"
        (dragstart)="onDragStart($event, col)"
        (dragover)="onDragOver($event)"
        (drop)="onDrop($event, col)"
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
      <div class="ft-floating-filter-cell" [style.width.px]="col.width()">
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

  hasActiveFilter(col: Column<TData>): boolean {
    return !!this.filterService.filterModel()[col.colId];
  }

  readonly openFilterColId = signal<string | null>(null);
  readonly resizingColId = signal<string | null>(null);
  private draggingColId: string | null = null;
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
    this.draggingColId = col.colId;
    event.dataTransfer?.setData('text/plain', col.colId);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent, targetCol: Column<TData>): void {
    event.preventDefault();
    const sourceId = this.draggingColId ?? event.dataTransfer?.getData('text/plain');
    if (!sourceId || sourceId === targetCol.colId) return;
    const cols = this.columnModel.columns();
    const toIndex = cols.findIndex((c) => c.colId === targetCol.colId);
    this.columnModel.moveColumn(sourceId, toIndex);
    this.draggingColId = null;
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
