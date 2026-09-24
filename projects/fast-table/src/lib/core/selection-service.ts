import { Injectable, computed, signal, Signal } from '@angular/core';
import { RowNode } from '../models/row-node';
import { ColumnModel } from './column-model';
import { ClientSideRowModel } from './client-side-row-model';

export interface CellRange {
  startRowIndex: number;
  endRowIndex: number;
  colIds: string[];
}

export type RowSelectionMode = 'single' | 'multiple' | 'none';

/** Row selection (single/multi with shift/ctrl) plus 2D cell range selection,
 *  the coordinate system that the fill handle, status bar and charts build on. */
@Injectable()
export class SelectionService<TData = any> {
  mode: RowSelectionMode = 'multiple';

  private readonly selectedIds = signal<Set<string>>(new Set());
  private lastSelectedIndex: number | null = null;

  readonly activeCell = signal<{ rowIndex: number; colId: string } | null>(null);
  readonly ranges = signal<CellRange[]>([]);
  readonly fillHandleActive = signal(false);
  /** True while the user is dragging out a cell range with the mouse (mousedown
   *  on a cell, not yet released) — cells extend the range on mouseenter while
   *  this is set, and the table cancels it globally on mouseup. */
  readonly rangeDragging = signal(false);

  constructor(
    private columnModel: ColumnModel<TData>,
    private rowModel: ClientSideRowModel<TData>,
  ) {}

  readonly selectedNodes: Signal<RowNode<TData>[]> = computed(() => {
    const ids = this.selectedIds();
    return this.rowModel.displayedRows().filter((n) => ids.has(n.id));
  });

  readonly selectedCount = computed(() => this.selectedIds().size);

  isSelected(node: RowNode<TData>): boolean {
    return this.selectedIds().has(node.id);
  }

  selectNode(
    node: RowNode<TData>,
    opts: { addToSelection?: boolean; rangeFrom?: boolean } = {},
  ): void {
    if (this.mode === 'none') return;
    const all = this.rowModel.displayedRows();
    const index = all.indexOf(node);

    if (this.mode === 'single') {
      this.setSelection([node.id]);
      node.setSelected(true);
      this.lastSelectedIndex = index;
      return;
    }

    if (opts.rangeFrom && this.lastSelectedIndex !== null) {
      const [from, to] = [this.lastSelectedIndex, index].sort((a, b) => a - b);
      const ids = new Set(opts.addToSelection ? this.selectedIds() : []);
      for (let i = from; i <= to; i++) ids.add(all[i].id);
      this.setSelection(Array.from(ids));
      return;
    }

    if (opts.addToSelection) {
      const ids = new Set(this.selectedIds());
      if (ids.has(node.id)) ids.delete(node.id);
      else ids.add(node.id);
      this.setSelection(Array.from(ids));
    } else {
      this.setSelection([node.id]);
    }
    this.lastSelectedIndex = index;
  }

  selectAll(): void {
    const all = this.rowModel.displayedRows();
    this.setSelection(all.map((n) => n.id));
  }

  deselectAll(): void {
    this.setSelection([]);
  }

  private setSelection(ids: string[]): void {
    const prevIds = this.selectedIds();
    for (const id of prevIds) this.rowModel.getNodeById(id)?.setSelected(false);
    const nextSet = new Set(ids);
    this.selectedIds.set(nextSet);
    for (const id of ids) this.rowModel.getNodeById(id)?.setSelected(true);
  }

  // ---- Cell range selection ----

  startRange(rowIndex: number, colId: string, additive = false): void {
    this.activeCell.set({ rowIndex, colId });
    const range: CellRange = { startRowIndex: rowIndex, endRowIndex: rowIndex, colIds: [colId] };
    this.ranges.set(additive ? [...this.ranges(), range] : [range]);
  }

  extendRange(rowIndex: number, colId: string): void {
    const current = this.ranges();
    if (current.length === 0) {
      this.startRange(rowIndex, colId);
      return;
    }
    const last = current[current.length - 1];
    const startColIndex = this.visibleColIds().indexOf(last.colIds[0]);
    const endColIndex = this.visibleColIds().indexOf(colId);
    const [lo, hi] = [Math.min(startColIndex, endColIndex), Math.max(startColIndex, endColIndex)];
    const colIds = this.visibleColIds().slice(lo, hi + 1);
    const updated: CellRange = { startRowIndex: last.startRowIndex, endRowIndex: rowIndex, colIds };
    this.ranges.set([...current.slice(0, -1), updated]);
  }

  private visibleColIds(): string[] {
    return this.columnModel.visibleColumns().map((c) => c.colId);
  }

  isCellInRange(rowIndex: number, colId: string): boolean {
    return this.ranges().some((r) => {
      const [lo, hi] = [
        Math.min(r.startRowIndex, r.endRowIndex),
        Math.max(r.startRowIndex, r.endRowIndex),
      ];
      return rowIndex >= lo && rowIndex <= hi && r.colIds.includes(colId);
    });
  }

  isRangeBoundary(
    rowIndex: number,
    colId: string,
  ): { top: boolean; bottom: boolean; left: boolean; right: boolean } | null {
    const range = this.ranges().find((r) => {
      const [lo, hi] = [
        Math.min(r.startRowIndex, r.endRowIndex),
        Math.max(r.startRowIndex, r.endRowIndex),
      ];
      return rowIndex >= lo && rowIndex <= hi && r.colIds.includes(colId);
    });
    if (!range) return null;
    const [lo, hi] = [
      Math.min(range.startRowIndex, range.endRowIndex),
      Math.max(range.startRowIndex, range.endRowIndex),
    ];
    const colIndex = range.colIds.indexOf(colId);
    return {
      top: rowIndex === lo,
      bottom: rowIndex === hi,
      left: colIndex === 0,
      right: colIndex === range.colIds.length - 1,
    };
  }

  clearRanges(): void {
    this.ranges.set([]);
  }

  getRangeCells(): { rowIndex: number; colId: string }[] {
    const out: { rowIndex: number; colId: string }[] = [];
    for (const r of this.ranges()) {
      const [lo, hi] = [
        Math.min(r.startRowIndex, r.endRowIndex),
        Math.max(r.startRowIndex, r.endRowIndex),
      ];
      for (let i = lo; i <= hi; i++) for (const colId of r.colIds) out.push({ rowIndex: i, colId });
    }
    return out;
  }
}
