import type {
  ColumnFilterModel,
  TextFilterModel,
  NumberFilterModel,
  DateFilterModel,
  SetFilterModel,
  MultiFilterModel,
} from '../../models/filter-model';
import type { FilterOperator } from '../../models/enums';
import { RELATIVE_DATE_PRESETS, type RelativeDatePreset } from '../../models/filter-model';

export function matchesTextFilter(value: unknown, model: TextFilterModel): boolean {
  const s = value == null ? '' : String(value).toLowerCase();
  const f = model.filter.toLowerCase();
  switch (model.operator) {
    case 'contains':
      return s.includes(f);
    case 'notContains':
      return !s.includes(f);
    case 'equals':
      return s === f;
    case 'notEqual':
      return s !== f;
    case 'startsWith':
      return s.startsWith(f);
    case 'endsWith':
      return s.endsWith(f);
    case 'blank':
      return s.trim() === '';
    case 'notBlank':
      return s.trim() !== '';
    default:
      return true;
  }
}

export function matchesNumberFilter(value: unknown, model: NumberFilterModel): boolean {
  const n = typeof value === 'number' ? value : value == null ? null : Number(value);
  const f = model.filter;
  switch (model.operator) {
    case 'equals':
      return n === f;
    case 'notEqual':
      return n !== f;
    case 'lessThan':
      return n !== null && f !== null && n < f;
    case 'lessThanOrEqual':
      return n !== null && f !== null && n <= f;
    case 'greaterThan':
      return n !== null && f !== null && n > f;
    case 'greaterThanOrEqual':
      return n !== null && f !== null && n >= f;
    case 'inRange':
      return n !== null && f !== null && model.filterTo != null && n >= f && n <= model.filterTo;
    case 'blank':
      return n === null;
    case 'notBlank':
      return n !== null;
    default:
      return true;
  }
}

export function resolveRelativeDateRange(
  preset: RelativeDatePreset,
  now = new Date(),
): [Date, Date] {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  switch (preset) {
    case 'today':
      return [start, end];
    case 'yesterday': {
      const s = new Date(start);
      s.setDate(s.getDate() - 1);
      return [s, start];
    }
    case 'thisWeek': {
      const s = new Date(start);
      s.setDate(s.getDate() - s.getDay());
      const e = new Date(s);
      e.setDate(e.getDate() + 7);
      return [s, e];
    }
    case 'thisMonth': {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      return [s, e];
    }
    case 'thisQuarter': {
      const q = Math.floor(now.getMonth() / 3);
      const s = new Date(now.getFullYear(), q * 3, 1);
      const e = new Date(now.getFullYear(), q * 3 + 3, 1);
      return [s, e];
    }
    case 'thisYear':
    case 'yearToDate': {
      const s = new Date(now.getFullYear(), 0, 1);
      const e = preset === 'yearToDate' ? end : new Date(now.getFullYear() + 1, 0, 1);
      return [s, e];
    }
    case 'last7Days': {
      const s = new Date(start);
      s.setDate(s.getDate() - 7);
      return [s, end];
    }
    case 'last30Days': {
      const s = new Date(start);
      s.setDate(s.getDate() - 30);
      return [s, end];
    }
    case 'last90Days': {
      const s = new Date(start);
      s.setDate(s.getDate() - 90);
      return [s, end];
    }
    default:
      return [start, end];
  }
}

export function isRelativeDatePreset(value: string): value is RelativeDatePreset {
  return (RELATIVE_DATE_PRESETS as readonly string[]).includes(value);
}

export function matchesDateFilter(value: unknown, model: DateFilterModel): boolean {
  const d = value instanceof Date ? value : value ? new Date(value as string) : null;
  if (model.operator === 'blank') return d === null || isNaN(d.getTime());
  if (model.operator === 'notBlank') return d !== null && !isNaN(d.getTime());
  if (!d || isNaN(d.getTime())) return false;

  if (model.dateFrom && isRelativeDatePreset(model.dateFrom)) {
    const [start, end] = resolveRelativeDateRange(model.dateFrom);
    return d >= start && d < end;
  }

  const from = model.dateFrom ? new Date(model.dateFrom) : null;
  const to = model.dateTo ? new Date(model.dateTo) : null;
  switch (model.operator) {
    case 'equals':
      return !!from && d.toDateString() === from.toDateString();
    case 'notEqual':
      return !from || d.toDateString() !== from.toDateString();
    case 'lessThan':
      return !!from && d < from;
    case 'greaterThan':
      return !!from && d > from;
    case 'inRange':
      return !!from && !!to && d >= from && d <= to;
    default:
      return true;
  }
}

export function matchesSetFilter(value: unknown, model: SetFilterModel): boolean {
  const s = value == null ? '(Blanks)' : String(value);
  return model.values.includes(s);
}

export function matchesMultiFilter(value: unknown, model: MultiFilterModel): boolean {
  return model.models.every((m) => (m ? matchesColumnFilter(value, m) : true));
}

export function matchesColumnFilter(value: unknown, model: ColumnFilterModel): boolean {
  switch (model.filterType) {
    case 'text':
      return matchesTextFilter(value, model);
    case 'number':
      return matchesNumberFilter(value, model);
    case 'date':
      return matchesDateFilter(value, model);
    case 'set':
      return matchesSetFilter(value, model);
    case 'multi':
      return matchesMultiFilter(value, model);
  }
}

export const OPERATORS_BY_TYPE: Record<'text' | 'number' | 'date', FilterOperator[]> = {
  text: [
    'contains',
    'notContains',
    'equals',
    'notEqual',
    'startsWith',
    'endsWith',
    'blank',
    'notBlank',
  ],
  number: [
    'equals',
    'notEqual',
    'lessThan',
    'lessThanOrEqual',
    'greaterThan',
    'greaterThanOrEqual',
    'inRange',
    'blank',
    'notBlank',
  ],
  date: ['equals', 'notEqual', 'lessThan', 'greaterThan', 'inRange', 'blank', 'notBlank'],
};
