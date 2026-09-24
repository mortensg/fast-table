import { Injectable, Injector, inject } from '@angular/core';
import { Column } from './column';
import { RowNode } from '../models/row-node';
import { FormulaService } from '../features/formula/formula-service';

/** Resolves and caches cell values via valueGetter/field, and applies valueFormatter/valueSetter. */
@Injectable()
export class ValueService<TData = any> {
  private api: unknown = null;
  private injector = inject(Injector);
  private formulaServiceCache: FormulaService<TData> | undefined;

  setApi(api: unknown): void {
    this.api = api;
  }

  /** Lazily resolved via the injector (not constructor-injected) to avoid a
   *  ValueService -> FormulaService -> ClientSideRowModel -> ValueService cycle. */
  private getFormulaService(): FormulaService<TData> {
    if (!this.formulaServiceCache) {
      this.formulaServiceCache = this.injector.get(FormulaService);
    }
    return this.formulaServiceCache!;
  }

  getValue(column: Column<TData>, node: RowNode<TData>): unknown {
    const cached = node.getCached(column.colId);
    if (cached.hit) return cached.value;

    let value: unknown;
    const colDef = column.colDef;
    if (colDef.valueGetter) {
      value = colDef.valueGetter({ data: node.data, node, colId: column.colId, api: this.api });
    } else if (node.group && node.aggData && column.colId in node.aggData) {
      value = node.aggData[column.colId];
    } else if (colDef.allowFormula && colDef.field && node.data !== undefined) {
      const raw = this.readPath(node.data, colDef.field);
      value =
        typeof raw === 'string' && raw.startsWith('=')
          ? this.getFormulaService().evaluateFormulaForNode(raw, node, column.colId)
          : raw;
    } else if (colDef.field && node.data !== undefined) {
      value = this.readPath(node.data, colDef.field);
    } else {
      value = undefined;
    }
    node.setCached(column.colId, value);
    return value;
  }

  /** Returns the raw stored value, bypassing formula evaluation (used by the formula editor to show "=SUM(...)"). */
  getRawValue(column: Column<TData>, node: RowNode<TData>): unknown {
    const colDef = column.colDef;
    if (colDef.field && node.data !== undefined) return this.readPath(node.data, colDef.field);
    return this.getValue(column, node);
  }

  getFormattedValue(column: Column<TData>, node: RowNode<TData>): string {
    const value = this.getValue(column, node);
    const colDef = column.colDef;
    if (colDef.valueFormatter) {
      return colDef.valueFormatter({
        value,
        data: node.data,
        node,
        colId: column.colId,
        api: this.api,
      });
    }
    return this.defaultFormat(value, colDef.type);
  }

  private defaultFormat(value: unknown, type: string | undefined): string {
    if (value === null || value === undefined) return '';
    if (type === 'date' && value instanceof Date) return value.toLocaleDateString();
    if (type === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number')
      return Number.isInteger(value) ? String(value) : value.toFixed(2);
    return String(value);
  }

  setValue(column: Column<TData>, node: RowNode<TData>, newValue: unknown): boolean {
    const colDef = column.colDef;
    const oldValue = this.getValue(column, node);
    if (colDef.valueSetter) {
      const ok = colDef.valueSetter({
        data: node.data,
        node,
        colId: column.colId,
        api: this.api,
        oldValue,
        newValue,
      });
      node.clearCache(column.colId);
      return ok;
    }
    if (colDef.field && node.data !== undefined) {
      this.writePath(node.data as Record<string, unknown>, colDef.field, newValue);
      node.clearCache(column.colId);
      return true;
    }
    return false;
  }

  private readPath(obj: unknown, path: string): unknown {
    if (!path.includes('.')) return (obj as Record<string, unknown>)?.[path];
    return path
      .split('.')
      .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], obj);
  }

  private writePath(obj: Record<string, unknown>, path: string, value: unknown): void {
    if (!path.includes('.')) {
      obj[path] = value;
      return;
    }
    const parts = path.split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      cur = cur[parts[i]] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]] = value;
  }
}
