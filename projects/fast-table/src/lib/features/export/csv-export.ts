import { ColumnModel } from '../../core/column-model';
import { ValueService } from '../../core/value-service';
import { RowNode } from '../../models/row-node';

export interface CsvExportParams<TData = any> {
  fileName?: string;
  columnKeys?: string[];
  onlySelected?: boolean;
  selectedNodes?: RowNode<TData>[];
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildCsvContent<TData>(
  columnModel: ColumnModel<TData>,
  rows: RowNode<TData>[],
  valueService: ValueService<TData>,
  params?: CsvExportParams<TData>,
): string {
  const columns = columnModel
    .visibleColumns()
    .filter((c) => !params?.columnKeys || params.columnKeys.includes(c.colId));

  const source = params?.onlySelected && params.selectedNodes ? params.selectedNodes : rows;

  const lines: string[] = [];
  lines.push(columns.map((c) => csvEscape(c.headerName())).join(','));
  for (const node of source) {
    if (node.data === undefined) continue;
    lines.push(columns.map((c) => csvEscape(valueService.getFormattedValue(c, node))).join(','));
  }
  return lines.join('\r\n');
}

export function exportToCsv<TData>(
  columnModel: ColumnModel<TData>,
  rows: RowNode<TData>[],
  valueService: ValueService<TData>,
  params?: CsvExportParams<TData>,
): void {
  const csv = buildCsvContent(columnModel, rows, valueService, params);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = params?.fileName ?? 'export.csv';
  a.click();
  URL.revokeObjectURL(url);
}
