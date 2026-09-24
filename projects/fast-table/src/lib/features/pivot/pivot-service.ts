import { Injectable, computed, Signal } from '@angular/core';
import { ColumnModel } from '../../core/column-model';
import { ValueService } from '../../core/value-service';
import { ClientSideRowModel } from '../../core/client-side-row-model';
import { Column } from '../../core/column';
import { RowNode } from '../../models/row-node';
import { resolveAggFunc } from '../grouping/aggregation';
import type { ColDef } from '../../models/column-def';
import type { AggFuncName } from '../../models/enums';

export interface PivotColumnMeta {
  colId: string;
  pivotKey: string;
  valueColId: string;
}

/** Derives the dynamic "pivot result" columns (one per unique pivot-column
 *  value x value-column combination) and computes their aggregated values
 *  per group node — the horizontal axis of pivot mode. */
@Injectable()
export class PivotService<TData = any> {
  constructor(
    private columnModel: ColumnModel<TData>,
    private valueService: ValueService<TData>,
    private rowModel: ClientSideRowModel<TData>,
  ) {}

  private pivotKeyOf(leaf: RowNode<TData>, pivotCols: Column<TData>[]): string {
    return pivotCols
      .map((c) => String(this.valueService.getValue(c, leaf) ?? '(Blanks)'))
      .join(' | ');
  }

  readonly uniquePivotKeys: Signal<string[]> = computed(() => {
    const pivotCols = this.columnModel.pivotColumns();
    if (pivotCols.length === 0) return [];
    const leaves = this.rowModel.leafNodes();
    const keys = new Set<string>();
    for (const leaf of leaves) keys.add(this.pivotKeyOf(leaf, pivotCols));
    return Array.from(keys).sort();
  });

  /** Synthetic Column instances for each (pivot value x value column) pair, plus a total-per-value-column. */
  readonly pivotResultColumns: Signal<Column<TData>[]> = computed(() => {
    const pivotCols = this.columnModel.pivotColumns();
    const valueCols = this.columnModel.valueColumns();
    if (pivotCols.length === 0 || valueCols.length === 0) return [];
    const keys = this.uniquePivotKeys();
    const columns: Column<TData>[] = [];

    for (const key of keys) {
      for (const valueCol of valueCols) {
        const colId = `pivot:${key}:${valueCol.colId}`;
        const def: ColDef<TData> = {
          colId,
          headerName: `${key} | ${valueCol.headerName()}`,
          type: 'number',
          width: 130,
          sortable: false,
          filter: false,
          valueGetter: ({ node }) => (node as RowNode<TData>).aggData[colId],
          valueFormatter: valueCol.colDef.valueFormatter,
        };
        columns.push(new Column<TData>(colId, def));
      }
    }
    for (const valueCol of valueCols) {
      const colId = `pivotTotal:${valueCol.colId}`;
      const def: ColDef<TData> = {
        colId,
        headerName: `Total ${valueCol.headerName()}`,
        type: 'number',
        width: 130,
        sortable: false,
        filter: false,
        cellClass: () => 'ft-pivot-total-col',
        valueGetter: ({ node }) => (node as RowNode<TData>).aggData[colId],
        valueFormatter: valueCol.colDef.valueFormatter,
      };
      columns.push(new Column<TData>(colId, def));
    }
    return columns;
  });

  /** Populates node.aggData with pivoted aggregates for a single group node's leaves. */
  computePivotAggregates(node: RowNode<TData>): void {
    const pivotCols = this.columnModel.pivotColumns();
    const valueCols = this.columnModel.valueColumns();
    if (pivotCols.length === 0 || valueCols.length === 0) return;

    const buckets = new Map<string, RowNode<TData>[]>();
    for (const leaf of node.allLeafChildren) {
      const key = this.pivotKeyOf(leaf, pivotCols);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(leaf);
    }

    for (const [key, leaves] of buckets) {
      for (const valueCol of valueCols) {
        const fn = resolveAggFunc(valueCol.aggFunc() as AggFuncName | null);
        if (!fn) continue;
        const colId = `pivot:${key}:${valueCol.colId}`;
        node.aggData[colId] = fn({
          values: leaves.map((l) => this.valueService.getValue(valueCol, l)),
        });
      }
    }
    for (const valueCol of valueCols) {
      const fn = resolveAggFunc(valueCol.aggFunc() as AggFuncName | null);
      if (!fn) continue;
      const colId = `pivotTotal:${valueCol.colId}`;
      node.aggData[colId] = fn({
        values: node.allLeafChildren.map((l) => this.valueService.getValue(valueCol, l)),
      });
    }
  }
}
