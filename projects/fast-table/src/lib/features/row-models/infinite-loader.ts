import { Injectable, signal } from '@angular/core';
import { ClientSideRowModel } from '../../core/client-side-row-model';
import { ColumnModel } from '../../core/column-model';
import type { IDatasource, IServerSideDatasource } from '../../models/grid-options';

/**
 * Drives the infinite / server-side row models by fetching blocks lazily as
 * the user scrolls near the loaded edge, feeding results into the same
 * ClientSideRowModel that powers rendering (rather than a fully separate
 * virtualization pipeline) — the datasource contract still matches ag-Grid's,
 * so swapping a real backend in is a drop-in change.
 */
@Injectable()
export class InfiniteLoader<TData = any> {
  datasource: IDatasource | null = null;
  serverSideDatasource: IServerSideDatasource | null = null;
  blockSize = 100;

  readonly loading = signal(false);
  readonly lastRow = signal<number | null>(null);
  private loadedRows: TData[] = [];
  private inFlight = false;

  constructor(
    private rowModel: ClientSideRowModel<TData>,
    private columnModel: ColumnModel<TData>,
  ) {}

  reset(): void {
    this.loadedRows = [];
    this.lastRow.set(null);
    this.rowModel.setRowData([]);
    this.loadNextBlock();
  }

  maybeLoadMore(scrollTop: number, viewportHeight: number, rowHeight: number): void {
    if (this.inFlight) return;
    const total = this.lastRow();
    if (total !== null && this.loadedRows.length >= total) return;
    const scrolledRows = (scrollTop + viewportHeight) / rowHeight;
    if (scrolledRows >= this.loadedRows.length - this.blockSize / 2) {
      this.loadNextBlock();
    }
  }

  private loadNextBlock(): void {
    if (this.inFlight) return;
    const startRow = this.loadedRows.length;
    const endRow = startRow + this.blockSize;
    this.inFlight = true;
    this.loading.set(true);

    if (this.datasource) {
      this.datasource.getRows({
        startRow,
        endRow,
        successCallback: (rows, lastRow) => {
          this.loadedRows = [...this.loadedRows, ...rows];
          this.rowModel.setRowData(this.loadedRows as TData[]);
          if (lastRow !== undefined && lastRow >= 0) this.lastRow.set(lastRow);
          this.inFlight = false;
          this.loading.set(false);
        },
        failCallback: () => {
          this.inFlight = false;
          this.loading.set(false);
        },
      });
      return;
    }

    if (this.serverSideDatasource) {
      const sortModel = this.columnModel
        .activeSorts()
        .map((c) => ({ colId: c.colId, sort: c.sort() as 'asc' | 'desc' }));
      this.serverSideDatasource.getRows({
        startRow,
        endRow,
        sortModel,
        filterModel: {},
        groupKeys: [],
        rowGroupCols: this.columnModel
          .rowGroupColumns()
          .map((c) => ({ id: c.colId, field: c.field ?? '' })),
        pivotCols: this.columnModel
          .pivotColumns()
          .map((c) => ({ id: c.colId, field: c.field ?? '' })),
        pivotMode: this.columnModel.pivotModeSig(),
        valueCols: this.columnModel
          .valueColumns()
          .map((c) => ({ id: c.colId, field: c.field ?? '', aggFunc: String(c.aggFunc()) })),
        successCallback: (rows, lastRow) => {
          this.loadedRows = [...this.loadedRows, ...rows];
          this.rowModel.setRowData(this.loadedRows as TData[]);
          if (lastRow >= 0) this.lastRow.set(lastRow);
          this.inFlight = false;
          this.loading.set(false);
        },
        failCallback: () => {
          this.inFlight = false;
          this.loading.set(false);
        },
      });
    }
  }
}
