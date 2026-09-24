import { signal, WritableSignal } from '@angular/core';
import type { RowPinned } from './enums';

let nodeIdCounter = 0;

export interface RowNodeOptions<TData = any> {
  id: string;
  data: TData | undefined;
  level: number;
  parent: RowNode<TData> | null;
  group?: boolean;
  field?: string;
  key?: string | null;
}

/**
 * Wraps a single row of data plus all grid-derived state (selection, expansion,
 * grouping, aggregation). Stable per getRowId so state survives data refreshes.
 */
export class RowNode<TData = any> {
  readonly nodeId = nodeIdCounter++;
  readonly id: string;
  data: TData | undefined;
  level: number;
  parent: RowNode<TData> | null;

  /** True when this node represents a group (row-group or tree branch), not a leaf record. */
  group = false;
  /** True when this node was synthesized to fill a gap in tree data paths. */
  isFillerNode = false;
  field: string | undefined;
  key: string | null = null;
  childrenAfterGroup: RowNode<TData>[] = [];
  childrenAfterFilter: RowNode<TData>[] = [];
  childrenAfterSort: RowNode<TData>[] = [];
  allLeafChildren: RowNode<TData>[] = [];
  leafCount = 0;

  readonly expanded: WritableSignal<boolean> = signal(false);
  readonly selected: WritableSignal<boolean> = signal(false);
  readonly rowPinned: WritableSignal<RowPinned> = signal(null);

  /** Cached aggregate values keyed by colId, populated by the aggregation stage. */
  aggData: Record<string, unknown> = {};
  /** Cached valueGetter results keyed by colId for the current data reference. */
  private valueCache = new Map<string, unknown>();

  rowIndex: number | null = null;
  rowTop: number | null = null;
  rowHeight = 36;

  readonly detailExpanded: WritableSignal<boolean> = signal(false);
  isDetailRow = false;
  masterNode: RowNode<TData> | null = null;

  constructor(options: RowNodeOptions<TData>) {
    this.id = options.id;
    this.data = options.data;
    this.level = options.level;
    this.parent = options.parent;
    this.group = !!options.group;
    this.field = options.field;
    this.key = options.key ?? null;
  }

  setData(data: TData): void {
    this.data = data;
    this.valueCache.clear();
  }

  getCached(colId: string): { hit: true; value: unknown } | { hit: false } {
    if (this.valueCache.has(colId)) {
      return { hit: true, value: this.valueCache.get(colId) };
    }
    return { hit: false };
  }

  setCached(colId: string, value: unknown): void {
    this.valueCache.set(colId, value);
  }

  clearCache(colId?: string): void {
    if (colId) this.valueCache.delete(colId);
    else this.valueCache.clear();
  }

  isSelected(): boolean {
    return this.selected();
  }

  setSelected(value: boolean): void {
    this.selected.set(value);
  }

  setExpanded(value: boolean): void {
    this.expanded.set(value);
  }

  toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }

  toggleDetail(): void {
    this.detailExpanded.update((v) => !v);
  }

  get childCount(): number {
    return this.allLeafChildren.length;
  }
}
