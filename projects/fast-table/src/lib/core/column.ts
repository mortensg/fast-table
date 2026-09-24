import { signal, WritableSignal } from '@angular/core';
import type { ColDef } from '../models/column-def';
import type { ColumnPinned, SortDirection } from '../models/enums';

/**
 * Runtime wrapper around a ColDef. Holds mutable layout/state that changes
 * during a session (width, pinned side, sort, visibility) separately from the
 * user-authored definition so ColDef objects passed in stay untouched.
 */
export class Column<TData = any> {
  readonly colId: string;
  colDef: ColDef<TData>;

  readonly width: WritableSignal<number>;
  readonly hide: WritableSignal<boolean>;
  readonly pinned: WritableSignal<ColumnPinned>;
  readonly sort: WritableSignal<SortDirection>;
  readonly sortIndex: WritableSignal<number | null>;
  readonly rowGroupActive: WritableSignal<boolean>;
  readonly rowGroupIndex: WritableSignal<number | null>;
  readonly pivotActive: WritableSignal<boolean>;
  readonly pivotIndex: WritableSignal<number | null>;
  readonly aggFunc: WritableSignal<string | null>;
  readonly headerName: WritableSignal<string>;

  /** left offset in px within its pinned section, recomputed by ColumnModel on any layout change */
  left = 0;
  flex: number | undefined;
  minWidth: number;
  maxWidth: number;

  constructor(colId: string, colDef: ColDef<TData>) {
    this.colId = colId;
    this.colDef = colDef;
    this.width = signal(colDef.width ?? 150);
    this.hide = signal(!!colDef.hide);
    this.pinned = signal(colDef.pinned ?? null);
    this.sort = signal(colDef.sort ?? null);
    this.sortIndex = signal(colDef.sortIndex ?? null);
    this.rowGroupActive = signal(!!colDef.rowGroup);
    this.rowGroupIndex = signal(colDef.rowGroupIndex ?? null);
    this.pivotActive = signal(!!colDef.pivot);
    this.pivotIndex = signal(colDef.pivotIndex ?? null);
    this.aggFunc = signal((colDef.aggFunc as string) ?? null);
    this.headerName = signal(colDef.headerName ?? colDef.field ?? colId);
    this.flex = colDef.flex;
    this.minWidth = colDef.minWidth ?? 40;
    this.maxWidth = colDef.maxWidth ?? Number.MAX_SAFE_INTEGER;
  }

  get field(): string | undefined {
    return this.colDef.field;
  }

  isSortable(): boolean {
    return this.colDef.sortable !== false;
  }

  isResizable(): boolean {
    return this.colDef.resizable !== false;
  }

  isEditable(params: any): boolean {
    const e = this.colDef.editable;
    if (typeof e === 'function') return e(params);
    return !!e;
  }

  isFilterable(): boolean {
    return !!this.colDef.filter;
  }
}
