import { Injectable, computed, signal, untracked, Signal, WritableSignal } from '@angular/core';
import { Column } from './column';
import type { ColDef, ColumnGroupDef, ColumnState } from '../models/column-def';
import { isColumnGroupDef } from '../models/column-def';
import type { ColumnPinned } from '../models/enums';

export interface DisplayedColumnGroup {
  groupId: string;
  headerName: string;
  columns: Column[];
  colSpan: number;
  level: number;
}

export type HeaderRowItem =
  { kind: 'group'; group: DisplayedColumnGroup } | { kind: 'column'; column: Column };

/**
 * Owns the live Column[] derived from ColDef[]/ColumnGroupDef[], their widths,
 * order, pinning, grouping/pivot/sort flags, and exposes signals the table and
 * header components read directly (no manual change detection wiring needed).
 */
@Injectable()
export class ColumnModel<TData = any> {
  private readonly _columns: WritableSignal<Column<TData>[]> = signal([]);
  private readonly _columnDefs: WritableSignal<(ColDef<TData> | ColumnGroupDef<TData>)[]> = signal(
    [],
  );
  readonly viewportWidth = signal(0);
  /** colId of the column currently being dragged in the header, if any —
   *  its header, floating-filter and body cells render as a placeholder. */
  readonly draggingColId = signal<string | null>(null);

  readonly columns: Signal<Column<TData>[]> = this._columns.asReadonly();

  readonly pivotModeSig = signal(false);
  readonly pivotResultColumns: WritableSignal<Column<TData>[]> = signal([]);

  readonly visibleColumns = computed(() => {
    const base = this._columns().filter((c) => !c.hide());
    if (!this.pivotModeSig()) return base;
    const withoutPivotAndValue = base.filter((c) => !c.pivotActive() && c.aggFunc() == null);
    return [...withoutPivotAndValue, ...this.pivotResultColumns()];
  });

  readonly leftPinned = computed(() => this.visibleColumns().filter((c) => c.pinned() === 'left'));
  readonly rightPinned = computed(() =>
    this.visibleColumns().filter((c) => c.pinned() === 'right'),
  );
  readonly center = computed(() =>
    this.visibleColumns().filter((c) => c.pinned() !== 'left' && c.pinned() !== 'right'),
  );

  readonly rowGroupColumns = computed(() =>
    this._columns()
      .filter((c) => c.rowGroupActive())
      .sort((a, b) => (a.rowGroupIndex() ?? 0) - (b.rowGroupIndex() ?? 0)),
  );

  readonly pivotColumns = computed(() =>
    this._columns()
      .filter((c) => c.pivotActive())
      .sort((a, b) => (a.pivotIndex() ?? 0) - (b.pivotIndex() ?? 0)),
  );

  readonly valueColumns = computed(() => this._columns().filter((c) => c.aggFunc() != null));

  /** Total px width of the center (scrollable) section, honoring flex. */
  readonly centerTotalWidth = computed(() => this.sectionWidth(this.center()));
  readonly leftTotalWidth = computed(() => this.sectionWidth(this.leftPinned()));
  readonly rightTotalWidth = computed(() => this.sectionWidth(this.rightPinned()));

  private sectionWidth(cols: Column<TData>[]): number {
    return cols.reduce((sum, c) => sum + c.width(), 0);
  }

  setColumnDefs(defs: (ColDef<TData> | ColumnGroupDef<TData>)[]): void {
    this._columnDefs.set(defs);
    const flat = this.flatten(defs);
    // untracked: this method may be invoked from within an effect() that reacts to
    // input changes — reading _columns() here must not register it as a dependency
    // of that effect, or the .set() below would re-trigger it in an infinite loop.
    const next = untracked(() => {
      const existing = new Map(this._columns().map((c) => [c.colId, c]));
      return flat.map((def) => {
        const colId = def.colId ?? def.field ?? `col-${Math.random().toString(36).slice(2, 9)}`;
        const prior = existing.get(colId);
        if (prior) {
          prior.colDef = def;
          return prior;
        }
        return new Column<TData>(colId, def);
      });
    });
    this._columns.set(next);
    this.applyFlex();
  }

  private flatten(defs: (ColDef<TData> | ColumnGroupDef<TData>)[]): ColDef<TData>[] {
    const out: ColDef<TData>[] = [];
    for (const def of defs) {
      if (isColumnGroupDef(def)) out.push(...this.flatten(def.children));
      else out.push(def);
    }
    return out;
  }

  get groupDefs(): (ColDef<TData> | ColumnGroupDef<TData>)[] {
    return this._columnDefs();
  }

  getColumn(colId: string): Column<TData> | undefined {
    return this._columns().find((c) => c.colId === colId);
  }

  getColumnByField(field: string): Column<TData> | undefined {
    return this._columns().find((c) => c.field === field);
  }

  setWidth(colId: string, width: number): void {
    const col = this.getColumn(colId);
    if (!col) return;
    // Rounded to a whole pixel — callers include drag-resize (fractional
    // clientX deltas) and autoSizeColumn (canvas measureText returns
    // fractional widths), and a fractional column width causes sub-pixel
    // border rendering seams between adjacent header/cell boxes.
    const clamped = Math.round(Math.max(col.minWidth, Math.min(col.maxWidth, width)));
    col.width.set(clamped);
  }

  setPinned(colId: string, pinned: ColumnPinned): void {
    this.getColumn(colId)?.pinned.set(pinned);
  }

  setVisible(colId: string, visible: boolean): void {
    this.getColumn(colId)?.hide.set(!visible);
  }

  moveColumn(colId: string, toIndex: number): void {
    const cols = [...this._columns()];
    const fromIndex = cols.findIndex((c) => c.colId === colId);
    if (fromIndex === -1) return;
    const [col] = cols.splice(fromIndex, 1);
    cols.splice(toIndex, 0, col);
    this._columns.set(cols);
  }

  /** Moves `colId` so it sits directly before/after `targetColId` in the
   *  column order. Returns false (and leaves the order untouched) when the
   *  column is already in that slot — callers driving a live drag preview
   *  rely on that to avoid re-rendering on every dragover tick. */
  moveColumnNextTo(colId: string, targetColId: string, position: 'before' | 'after'): boolean {
    if (colId === targetColId) return false;
    const cols = [...this._columns()];
    const fromIndex = cols.findIndex((c) => c.colId === colId);
    if (fromIndex === -1) return false;
    const [col] = cols.splice(fromIndex, 1);
    const targetIndex = cols.findIndex((c) => c.colId === targetColId);
    if (targetIndex === -1) return false;
    const toIndex = position === 'before' ? targetIndex : targetIndex + 1;
    if (toIndex === fromIndex) return false;
    cols.splice(toIndex, 0, col);
    this._columns.set(cols);
    return true;
  }

  /** Restores a column order captured earlier (e.g. when a drag is cancelled). */
  setColumnOrder(colIds: string[]): void {
    const byId = new Map(this._columns().map((c) => [c.colId, c]));
    const ordered = colIds.map((id) => byId.get(id)).filter((c): c is Column<TData> => !!c);
    for (const c of this._columns()) if (!colIds.includes(c.colId)) ordered.push(c);
    this._columns.set(ordered);
  }

  setRowGroup(colId: string, active: boolean): void {
    const col = this.getColumn(colId);
    if (!col) return;
    col.rowGroupActive.set(active);
    if (active) {
      const maxIndex = Math.max(-1, ...this.rowGroupColumns().map((c) => c.rowGroupIndex() ?? -1));
      col.rowGroupIndex.set(maxIndex + 1);
    } else {
      col.rowGroupIndex.set(null);
    }
  }

  setPivot(colId: string, active: boolean): void {
    const col = this.getColumn(colId);
    if (!col) return;
    col.pivotActive.set(active);
    if (active) {
      const maxIndex = Math.max(-1, ...this.pivotColumns().map((c) => c.pivotIndex() ?? -1));
      col.pivotIndex.set(maxIndex + 1);
    } else {
      col.pivotIndex.set(null);
    }
  }

  setAggFunc(colId: string, fn: string | null): void {
    this.getColumn(colId)?.aggFunc.set(fn);
  }

  setSort(colId: string, dir: 'asc' | 'desc' | null, multiSort = false): void {
    const cols = this._columns();
    if (!multiSort) {
      for (const c of cols) {
        if (c.colId !== colId) {
          c.sort.set(null);
          c.sortIndex.set(null);
        }
      }
    }
    const col = this.getColumn(colId);
    if (!col) return;
    col.sort.set(dir);
    if (dir === null) {
      col.sortIndex.set(null);
      this.reindexSort();
    } else if (col.sortIndex() === null) {
      const maxIndex = Math.max(-1, ...cols.map((c) => c.sortIndex() ?? -1));
      col.sortIndex.set(maxIndex + 1);
    }
  }

  private reindexSort(): void {
    const sorted = this._columns()
      .filter((c) => c.sort() !== null)
      .sort((a, b) => (a.sortIndex() ?? 0) - (b.sortIndex() ?? 0));
    sorted.forEach((c, i) => c.sortIndex.set(i));
  }

  clearAllSort(): void {
    for (const c of this._columns()) {
      c.sort.set(null);
      c.sortIndex.set(null);
    }
  }

  readonly activeSorts = computed(() =>
    this._columns()
      .filter((c) => c.sort() !== null)
      .sort((a, b) => (a.sortIndex() ?? 0) - (b.sortIndex() ?? 0)),
  );

  private applyFlex(): void {
    // Recomputed explicitly by ft-table (applyFlexSizing) once the actual
    // viewport width is known — nothing to do at column-def-setting time.
  }

  /** Distributes `availableWidth` across the center (non-pinned) columns that
   *  declare `flex`, proportionally to their flex value, so a column can grow
   *  to fill whatever space is left over instead of leaving the grid narrower
   *  than its container. Non-flex columns keep their explicit width. Called
   *  by ft-table whenever the viewport or column set changes. */
  applyFlexSizing(availableWidth: number): void {
    const centerCols = this.center();
    const flexCols = centerCols.filter((c) => (c.flex ?? 0) > 0);
    if (flexCols.length === 0) return;

    const fixedWidth = centerCols
      .filter((c) => !(c.flex && c.flex > 0))
      .reduce((sum, c) => sum + c.width(), 0);
    const totalFlex = flexCols.reduce((sum, c) => sum + (c.flex ?? 0), 0);
    const remaining = Math.max(0, availableWidth - fixedWidth);

    for (const col of flexCols) {
      const share = (remaining * (col.flex ?? 0)) / totalFlex;
      // Round to a whole pixel — a fractional width here (e.g. 129.6px) causes
      // sub-pixel border rendering seams in the header (a faint partial-height
      // line at the column boundary) since adjacent borders no longer land on
      // the same device pixel.
      const clamped = Math.round(Math.max(col.minWidth, Math.min(col.maxWidth, share)));
      if (Math.abs(clamped - col.width()) > 0.5) col.width.set(clamped);
    }
  }

  getState(): ColumnState[] {
    return this._columns().map((c, i) => ({
      colId: c.colId,
      width: c.width(),
      hide: c.hide(),
      pinned: c.pinned(),
      sort: c.sort(),
      sortIndex: c.sortIndex(),
      rowGroup: c.rowGroupActive(),
      rowGroupIndex: c.rowGroupIndex(),
      pivot: c.pivotActive(),
      pivotIndex: c.pivotIndex(),
      aggFunc: c.aggFunc() as any,
      order: i,
    }));
  }

  applyState(state: ColumnState[]): void {
    const byId = new Map(state.map((s) => [s.colId, s]));
    const ordered = [...this._columns()].sort((a, b) => {
      const sa = byId.get(a.colId)?.order ?? 0;
      const sb = byId.get(b.colId)?.order ?? 0;
      return sa - sb;
    });
    for (const col of ordered) {
      const s = byId.get(col.colId);
      if (!s) continue;
      if (s.width !== undefined) col.width.set(s.width);
      if (s.hide !== undefined) col.hide.set(s.hide);
      if (s.pinned !== undefined) col.pinned.set(s.pinned);
      if (s.sort !== undefined) col.sort.set(s.sort);
      if (s.sortIndex !== undefined) col.sortIndex.set(s.sortIndex);
      if (s.rowGroup !== undefined) col.rowGroupActive.set(s.rowGroup);
      if (s.rowGroupIndex !== undefined) col.rowGroupIndex.set(s.rowGroupIndex);
      if (s.pivot !== undefined) col.pivotActive.set(s.pivot);
      if (s.pivotIndex !== undefined) col.pivotIndex.set(s.pivotIndex);
      if (s.aggFunc !== undefined) col.aggFunc.set(s.aggFunc);
    }
    this._columns.set(ordered);
  }

  autoSizeColumn(colId: string, sampleTextWidths: number[]): void {
    const col = this.getColumn(colId);
    if (!col) return;
    const headerWidth = 80;
    const contentWidth = Math.max(headerWidth, ...sampleTextWidths, col.minWidth);
    this.setWidth(colId, Math.min(contentWidth + 24, col.maxWidth));
  }
}
