import type { RowNode } from './row-node';
import type { ColumnState } from './column-def';

export interface CellPosition {
  rowIndex: number;
  rowPinned: 'top' | 'bottom' | null;
  colId: string;
}

export interface CellValueChangedEvent<TData = any> {
  data: TData;
  rowNode: RowNode<TData>;
  colId: string;
  oldValue: unknown;
  newValue: unknown;
  source: 'edit' | 'paste' | 'fill' | 'api' | 'undo' | 'redo' | 'topDown';
}

export interface RowSelectedEvent<TData = any> {
  node: RowNode<TData>;
  selected: boolean;
}

export interface SelectionChangedEvent<TData = any> {
  selectedNodes: RowNode<TData>[];
}

export interface SortChangedEvent {
  sortModel: { colId: string; sort: 'asc' | 'desc'; sortIndex: number }[];
}

export interface FilterChangedEvent {
  colId?: string;
}

export interface ColumnMovedEvent {
  colId: string;
  toIndex: number;
}

export interface ColumnResizedEvent {
  colId: string;
  width: number;
}

export interface ColumnVisibleEvent {
  colId: string;
  visible: boolean;
}

export interface ColumnPinnedEvent {
  colId: string;
  pinned: 'left' | 'right' | null;
}

export interface RowGroupOpenedEvent<TData = any> {
  node: RowNode<TData>;
  expanded: boolean;
}

export interface CellClickedEvent<TData = any> {
  data: TData;
  rowNode: RowNode<TData>;
  colId: string;
  value: unknown;
  rowIndex: number;
}

export interface CellContextMenuEvent<TData = any> extends CellClickedEvent<TData> {
  originalEvent: MouseEvent;
}

export interface RangeSelectionChangedEvent {
  ranges: { startRow: number; endRow: number; colIds: string[] }[];
}

export interface PasteEvent<TData = any> {
  cells: { rowIndex: number; colId: string; oldValue: unknown; newValue: unknown }[];
}

export interface GridReadyEvent {
  api: unknown;
}

export interface ColumnStateChangedEvent {
  state: ColumnState[];
}

export interface ModelUpdatedEvent {
  rowCount: number;
}
