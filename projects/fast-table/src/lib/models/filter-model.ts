import type { FilterOperator, JoinOperator } from './enums';

export interface TextFilterModel {
  filterType: 'text';
  operator: FilterOperator;
  filter: string;
}

export interface NumberFilterModel {
  filterType: 'number';
  operator: FilterOperator;
  filter: number | null;
  filterTo?: number | null;
}

export interface DateFilterModel {
  filterType: 'date';
  operator: FilterOperator;
  dateFrom: string | null;
  dateTo?: string | null;
}

export interface SetFilterModel {
  filterType: 'set';
  values: string[];
}

export interface MultiFilterModel {
  filterType: 'multi';
  models: (TextFilterModel | NumberFilterModel | DateFilterModel | SetFilterModel | null)[];
}

export type ColumnFilterModel =
  TextFilterModel | NumberFilterModel | DateFilterModel | SetFilterModel | MultiFilterModel;

export type FilterModel = Record<string, ColumnFilterModel>;

export interface AdvancedFilterCondition {
  type: 'condition';
  colId: string;
  operator: FilterOperator;
  value: unknown;
  valueTo?: unknown;
}

export interface AdvancedFilterGroup {
  type: 'group';
  join: JoinOperator;
  conditions: (AdvancedFilterCondition | AdvancedFilterGroup)[];
}

export type AdvancedFilterModel = AdvancedFilterGroup;

export const RELATIVE_DATE_PRESETS = [
  'today',
  'yesterday',
  'thisWeek',
  'thisMonth',
  'thisQuarter',
  'thisYear',
  'yearToDate',
  'last7Days',
  'last30Days',
  'last90Days',
] as const;

export type RelativeDatePreset = (typeof RELATIVE_DATE_PRESETS)[number];
