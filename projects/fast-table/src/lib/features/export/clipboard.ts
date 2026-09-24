import { ColumnModel } from '../../core/column-model';
import { ValueService } from '../../core/value-service';
import { EditingService } from '../../core/editing-service';
import { RowNode } from '../../models/row-node';

export async function copyRangeToClipboard<TData>(
  columnModel: ColumnModel<TData>,
  rows: RowNode<TData>[],
  valueService: ValueService<TData>,
  cells: { rowIndex: number; colId: string }[],
): Promise<void> {
  if (cells.length === 0) return;
  const rowIndices = Array.from(new Set(cells.map((c) => c.rowIndex))).sort((a, b) => a - b);
  const colIds = Array.from(new Set(cells.map((c) => c.colId)));
  const lines = rowIndices.map((ri) => {
    const node = rows[ri];
    if (!node) return '';
    return colIds
      .map((colId) => {
        const col = columnModel.getColumn(colId);
        return col ? valueService.getFormattedValue(col, node) : '';
      })
      .join('\t');
  });
  const text = lines.join('\n');
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // clipboard API unavailable (e.g. insecure context); silently no-op
  }
}

export async function pasteFromClipboard<TData>(
  columnModel: ColumnModel<TData>,
  rows: RowNode<TData>[],
  valueService: ValueService<TData>,
  editingService: EditingService<TData>,
  anchorCells: { rowIndex: number; colId: string }[],
): Promise<void> {
  if (anchorCells.length === 0) return;
  let text: string;
  try {
    text = await navigator.clipboard.readText();
  } catch {
    return;
  }
  const grid = text
    .replace(/\r/g, '')
    .split('\n')
    .filter((l) => l.length > 0)
    .map((line) => line.split('\t'));
  if (grid.length === 0) return;

  const startRow = Math.min(...anchorCells.map((c) => c.rowIndex));
  const visibleCols = columnModel.visibleColumns();
  const startColIndex = visibleCols.findIndex((c) => c.colId === anchorCells[0].colId);
  if (startColIndex === -1) return;

  const changes: { node: RowNode<TData>; colId: string; newValue: unknown }[] = [];
  grid.forEach((rowValues, r) => {
    const node = rows[startRow + r];
    if (!node) return;
    rowValues.forEach((value, c) => {
      const col = visibleCols[startColIndex + c];
      if (!col) return;
      const parsed = col.colDef.valueParser ? col.colDef.valueParser(value) : value;
      changes.push({ node, colId: col.colId, newValue: parsed });
    });
  });
  editingService.commitBatch(changes, 'paste');
}
