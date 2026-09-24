import type { Type } from '@angular/core';
import type { CellDataType, ColumnPinned, SortDirection, AggFuncName } from './enums';
import type { RowNode } from './row-node';

export interface ValueGetterParams<TData = any> {
  data: TData | undefined;
  node: RowNode<TData>;
  colId: string;
  api: unknown;
}

export interface ValueFormatterParams<TData = any> extends ValueGetterParams<TData> {
  value: unknown;
}

export interface ValueSetterParams<TData = any> extends ValueGetterParams<TData> {
  oldValue: unknown;
  newValue: unknown;
}

export type ValueGetterFn<TData = any> = (params: ValueGetterParams<TData>) => unknown;
export type ValueFormatterFn<TData = any> = (params: ValueFormatterParams<TData>) => string;
export type ValueSetterFn<TData = any> = (params: ValueSetterParams<TData>) => boolean;

export interface CellRendererParams<TData = any> {
  value: unknown;
  data: TData | undefined;
  node: RowNode<TData>;
  colDef: ColDef<TData>;
  api: unknown;
}

export interface CellEditorParams<TData = any> extends CellRendererParams<TData> {
  stopEditing: (cancel?: boolean) => void;
  setValue: (value: unknown) => void;
}

export interface CellClassParams<TData = any> {
  value: unknown;
  data: TData | undefined;
  node: RowNode<TData>;
}

export type CellClassFn<TData = any> = (params: CellClassParams<TData>) => string | string[] | null;

export interface CellRendererComponent<TData = any> {
  params: () => CellRendererParams<TData>;
}

export interface CellEditorComponent<TData = any> {
  params: () => CellEditorParams<TData>;
  getValue(): unknown;
  isCancelBeforeStart?(): boolean;
  isCancelAfterEnd?(): boolean;
}

export interface ValidatorParams<TData = any> {
  value: unknown;
  data: TData | undefined;
  node: RowNode<TData>;
  colDef: ColDef<TData>;
}

export type ValidatorFn<TData = any> = (params: ValidatorParams<TData>) => string | null;

export interface AggFuncParams {
  values: unknown[];
}

export type AggFuncFn = (params: AggFuncParams) => unknown;

export interface ColumnGroupDef<TData = any> {
  groupId: string;
  headerName: string;
  children: (ColDef<TData> | ColumnGroupDef<TData>)[];
  marryChildren?: boolean;
  openByDefault?: boolean;
}

export function isColumnGroupDef<TData>(
  def: ColDef<TData> | ColumnGroupDef<TData>,
): def is ColumnGroupDef<TData> {
  return (def as ColumnGroupDef<TData>).children !== undefined;
}

export interface ColDef<TData = any> {
  colId?: string;
  field?: string;
  headerName?: string;
  headerTooltip?: string;
  type?: CellDataType;

  width?: number;
  minWidth?: number;
  maxWidth?: number;
  flex?: number;
  resizable?: boolean;

  sortable?: boolean;
  sort?: SortDirection;
  sortIndex?: number | null;
  comparator?: (a: unknown, b: unknown, nodeA: RowNode<TData>, nodeB: RowNode<TData>) => number;
  lockPosition?: 'left' | 'right' | boolean;

  filter?: boolean | 'text' | 'number' | 'date' | 'set' | 'multi';
  filterParams?: Record<string, unknown>;
  floatingFilter?: boolean;

  hide?: boolean;
  pinned?: ColumnPinned;
  lockPinned?: boolean;
  lockVisible?: boolean;

  editable?: boolean | ((params: ValueGetterParams<TData>) => boolean);
  cellEditor?:
    | 'text'
    | 'number'
    | 'date'
    | 'checkbox'
    | 'select'
    | 'largeText'
    | 'richSelect'
    | 'formula'
    | Type<CellEditorComponent<TData>>;
  cellEditorParams?: Record<string, unknown>;
  singleClickEdit?: boolean;

  cellRenderer?:
    'checkbox' | 'badge' | 'sparkline' | 'rowGroup' | Type<CellRendererComponent<TData>>;
  cellRendererParams?: Record<string, unknown>;
  cellClass?: string | string[] | CellClassFn<TData>;
  cellStyle?: Record<string, string> | ((params: CellClassParams<TData>) => Record<string, string>);

  valueGetter?: ValueGetterFn<TData>;
  valueFormatter?: ValueFormatterFn<TData>;
  valueSetter?: ValueSetterFn<TData>;
  valueParser?: (value: string) => unknown;

  validators?: ValidatorFn<TData>[];

  rowGroup?: boolean;
  rowGroupIndex?: number | null;
  pivot?: boolean;
  pivotIndex?: number | null;
  enablePivot?: boolean;
  enableRowGroup?: boolean;
  enableValue?: boolean;

  aggFunc?: AggFuncName | AggFuncFn | null;
  allowedAggFuncs?: AggFuncName[];

  colSpan?: (params: CellClassParams<TData>) => number;
  rowSpan?: (params: CellClassParams<TData>) => number;

  checkboxSelection?: boolean;
  headerCheckboxSelection?: boolean;

  allowFormula?: boolean;

  rowDrag?: boolean;

  headerClass?: string | string[];

  columnGroupShow?: 'open' | 'closed';

  tooltipField?: string;
  tooltipValueGetter?: ValueGetterFn<TData>;
}

export interface ColumnState {
  colId: string;
  width?: number;
  hide?: boolean;
  pinned?: ColumnPinned;
  sort?: SortDirection;
  sortIndex?: number | null;
  rowGroup?: boolean;
  rowGroupIndex?: number | null;
  pivot?: boolean;
  pivotIndex?: number | null;
  aggFunc?: AggFuncName | null;
  order?: number;
}
