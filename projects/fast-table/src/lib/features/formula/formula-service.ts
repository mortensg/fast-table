import { Injectable } from '@angular/core';
import { ColumnModel } from '../../core/column-model';
import { ClientSideRowModel } from '../../core/client-side-row-model';
import { FormulaEngine, type FormulaFn } from './formula-engine';
import { RowNode } from '../../models/row-node';

/** Bridges the framework-agnostic FormulaEngine to the grid: resolves A1-style
 *  cell references against the grid's current visible-column order and
 *  displayed-row numbering. Reads raw field values directly (not through
 *  ValueService) to avoid a ValueService <-> FormulaService dependency cycle,
 *  since ValueService is what triggers formula evaluation in the first place. */
@Injectable()
export class FormulaService<TData = any> {
  private engine = new FormulaEngine();
  private evalStack = new Set<string>();

  constructor(
    private columnModel: ColumnModel<TData>,
    private rowModel: ClientSideRowModel<TData>,
  ) {}

  registerFunction(name: string, fn: FormulaFn): void {
    this.engine.registerFunction(name, fn);
  }

  private readRaw(colId: string, node: RowNode<TData>): unknown {
    const col = this.columnModel.getColumn(colId);
    if (!col?.colDef.field || node.data === undefined) return undefined;
    return (node.data as Record<string, unknown>)[col.colDef.field];
  }

  /** Reads a cell's effective value: evaluates it if it holds a formula string. */
  resolveCellValue(colId: string, node: RowNode<TData>): unknown {
    const raw = this.readRaw(colId, node);
    if (typeof raw === 'string' && raw.startsWith('=')) {
      return this.evaluateFormulaForNode(raw, node, colId);
    }
    return raw;
  }

  /** `colId` identifies which formula cell is being evaluated — required so the
   *  cycle guard is keyed per (row, column) rather than per row, since a
   *  formula column routinely references another formula column in the same
   *  row (e.g. a "flag" column referencing a "total" column) and that is not
   *  a cycle. */
  evaluateFormulaForNode(formula: string, node: RowNode<TData>, colId?: string): unknown {
    const key = `${node.id}:${colId ?? ''}`;
    if (this.evalStack.has(key)) return '#CYCLE!';
    this.evalStack.add(key);
    try {
      const visibleCols = this.columnModel.visibleColumns();
      const rows = this.rowModel.displayedRows();
      const rowNumber = (node.rowIndex ?? rows.indexOf(node)) + 1;

      return this.engine.evaluate(formula, (colLetter, rowNum) => {
        const colIndex = FormulaEngine.colToIndex(colLetter);
        const col = visibleCols[colIndex];
        const targetNode = rowNum === rowNumber ? node : rows[rowNum - 1];
        if (!col || !targetNode) return null;
        return this.resolveCellValue(col.colId, targetNode);
      });
    } finally {
      this.evalStack.delete(key);
    }
  }

  columnLetterFor(colId: string): string {
    const idx = this.columnModel.visibleColumns().findIndex((c) => c.colId === colId);
    return idx === -1 ? '?' : FormulaEngine.indexToCol(idx);
  }
}
