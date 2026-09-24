export type CellDataType =
  'text' | 'number' | 'boolean' | 'date' | 'dateString' | 'bigint' | 'object';

export type SortDirection = 'asc' | 'desc' | null;

export type ColumnPinned = 'left' | 'right' | null;

export type RowPinned = 'top' | 'bottom' | null;

export type GroupDisplayType = 'singleColumn' | 'multipleColumns' | 'groupRows';

export type RowModelKind = 'clientSide' | 'infinite' | 'viewport' | 'serverSide';

export type FilterOperator =
  | 'contains'
  | 'notContains'
  | 'equals'
  | 'notEqual'
  | 'startsWith'
  | 'endsWith'
  | 'blank'
  | 'notBlank'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'inRange';

export type JoinOperator = 'AND' | 'OR';

export type AggFuncName = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'first' | 'last';

export type SidebarPanelKind = 'columns' | 'filters';

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';
