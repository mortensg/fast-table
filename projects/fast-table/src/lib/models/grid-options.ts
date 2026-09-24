import type { RowModelKind, GroupDisplayType, SidebarPanelKind } from './enums';
import type { RowNode } from './row-node';
import type { ColDef, ColumnGroupDef } from './column-def';

export interface GetRowIdParams<TData = any> {
  data: TData;
}

export type GetRowIdFn<TData = any> = (params: GetRowIdParams<TData>) => string;
export type GetDataPathFn<TData = any> = (data: TData) => string[];

export interface IServerSideGetRowsParams {
  startRow: number;
  endRow: number;
  sortModel: { colId: string; sort: 'asc' | 'desc' }[];
  filterModel: unknown;
  groupKeys: string[];
  rowGroupCols: { id: string; field: string }[];
  pivotCols: { id: string; field: string }[];
  pivotMode: boolean;
  valueCols: { id: string; field: string; aggFunc: string }[];
  successCallback: (rows: any[], lastRow: number) => void;
  failCallback: () => void;
}

export interface IServerSideDatasource {
  getRows(params: IServerSideGetRowsParams): void;
}

export interface IDatasource {
  getRows(params: {
    startRow: number;
    endRow: number;
    successCallback: (rows: any[], lastRow?: number) => void;
    failCallback: () => void;
  }): void;
}

export interface StatusPanelDef {
  key: 'totalRows' | 'filteredRows' | 'selectedRows' | 'aggregation';
  align?: 'left' | 'center' | 'right';
}

export interface StatusBarConfig {
  statusPanels: StatusPanelDef[];
}

export interface SidebarToolPanelConfig {
  panels: SidebarPanelKind[];
  defaultOpen?: SidebarPanelKind | null;
}

export interface MasterDetailConfig<TData = any, TDetail = any> {
  getDetailRowData: (params: { data: TData }) => TDetail[] | Promise<TDetail[]>;
  detailColDefs: ColDef<TDetail>[];
  detailRowHeight?: number;
}

export interface RowClassParams<TData = any> {
  data: TData | undefined;
  node: RowNode<TData>;
}

export type RowClassFn<TData = any> = (params: RowClassParams<TData>) => string | string[] | null;
export type RowHeightFn<TData = any> = (params: RowClassParams<TData>) => number;

export interface GridOptions<TData = any> {
  columnDefs: (ColDef<TData> | ColumnGroupDef<TData>)[];
  rowData?: TData[];

  rowModelType?: RowModelKind;
  datasource?: IDatasource;
  serverSideDatasource?: IServerSideDatasource;
  cacheBlockSize?: number;

  getRowId?: GetRowIdFn<TData>;
  getDataPath?: GetDataPathFn<TData>;
  treeData?: boolean;
  autoGroupColumnDef?: ColDef<TData>;
  groupDisplayType?: GroupDisplayType;
  groupDefaultExpanded?: number;
  suppressStickyGroups?: boolean;

  rowHeight?: number | RowHeightFn<TData>;
  rowClass?: string | string[] | RowClassFn<TData>;
  fullWidthRowRenderer?: Type_<TData> | null;
  isFullWidthRow?: (params: RowClassParams<TData>) => boolean;

  pagination?: boolean;
  paginationPageSize?: number;
  paginationPageSizeSelector?: number[];

  rowSelection?: 'single' | 'multiple' | 'none';
  suppressRowClickSelection?: boolean;
  cellSelection?: boolean | { handle?: { mode: 'fill' | 'range' } };

  masterDetail?: MasterDetailConfig<TData, any> | null;

  sideBar?: SidebarToolPanelConfig | boolean;
  statusBar?: StatusBarConfig;

  animateRows?: boolean;
  quickFilterText?: string;

  undoRedoCellEditing?: boolean;
  undoRedoLimit?: number;

  pivotMode?: boolean;

  alignedGrids?: unknown[];

  rtl?: boolean;

  overscanRowCount?: number;
  overscanColCount?: number;

  onCellValueChanged?: (event: unknown) => void;
  onSelectionChanged?: (event: unknown) => void;
  onSortChanged?: (event: unknown) => void;
  onFilterChanged?: (event: unknown) => void;
  onGridReady?: (event: unknown) => void;
  onRowGroupOpened?: (event: unknown) => void;
  onCellClicked?: (event: unknown) => void;
  onCellContextMenu?: (event: unknown) => void;
}

// avoid importing Angular Type into a pure-model file cycle
type Type_<T> = new (...args: any[]) => T;
