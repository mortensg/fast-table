import { ColumnModel } from './column-model';
import { ClientSideRowModel } from './client-side-row-model';
import { FilterService } from './filter-service';
import { SelectionService } from './selection-service';
import { EditingService } from './editing-service';
import { ValueService } from './value-service';
import type { ColDef, ColumnGroupDef, ColumnState } from '../models/column-def';
import type { RowNode } from '../models/row-node';
import type { FilterModel } from '../models/filter-model';
import { exportToCsv, type CsvExportParams } from '../features/export/csv-export';
import { exportToExcel, type ExcelExportParams } from '../features/export/excel-export';
import { exportToPdf, type PdfExportParams } from '../features/export/pdf-export';
import { copyRangeToClipboard, pasteFromClipboard } from '../features/export/clipboard';

/** The public, stable surface consumers get via (gridReady) — everything else
 *  in `core/` is an implementation detail the host app shouldn't touch directly. */
export class GridApi<TData = any> {
  constructor(
    private columnModel: ColumnModel<TData>,
    private rowModel: ClientSideRowModel<TData>,
    private filterService: FilterService<TData>,
    private selectionService: SelectionService<TData>,
    private editingService: EditingService<TData>,
    private valueService: ValueService<TData>,
  ) {}

  // Row data
  setRowData(data: TData[]): void {
    this.rowModel.setRowData(data);
  }
  getRowData(): TData[] {
    return this.rowModel.getRowDataSnapshot();
  }
  applyTransaction(txn: { add?: TData[]; update?: TData[]; remove?: TData[] }): void {
    this.rowModel.applyTransaction(txn);
  }
  setPinnedTopRowData(data: TData[]): void {
    this.rowModel.setPinnedTopRowData(data);
  }
  setPinnedBottomRowData(data: TData[]): void {
    this.rowModel.setPinnedBottomRowData(data);
  }
  forEachNode(fn: (node: RowNode<TData>) => void): void {
    this.rowModel.displayedRows().forEach(fn);
  }
  getDisplayedRowCount(): number {
    return this.rowModel.rowCount();
  }

  // Columns
  setColumnDefs(defs: (ColDef<TData> | ColumnGroupDef<TData>)[]): void {
    this.columnModel.setColumnDefs(defs);
  }
  getColumnDefs(): (ColDef<TData> | ColumnGroupDef<TData>)[] {
    return this.columnModel.groupDefs;
  }
  setColumnWidth(colId: string, width: number): void {
    this.columnModel.setWidth(colId, width);
  }
  setColumnVisible(colId: string, visible: boolean): void {
    this.columnModel.setVisible(colId, visible);
  }
  setColumnPinned(colId: string, pinned: 'left' | 'right' | null): void {
    this.columnModel.setPinned(colId, pinned);
  }
  moveColumn(colId: string, toIndex: number): void {
    this.columnModel.moveColumn(colId, toIndex);
  }
  getColumnState(): ColumnState[] {
    return this.columnModel.getState();
  }
  applyColumnState(state: ColumnState[]): void {
    this.columnModel.applyState(state);
  }
  autoSizeColumn(colId: string, sampleWidths: number[]): void {
    this.columnModel.autoSizeColumn(colId, sampleWidths);
  }
  setSortModel(model: { colId: string; sort: 'asc' | 'desc' }[]): void {
    this.columnModel.clearAllSort();
    model.forEach((m, i) => {
      this.columnModel.setSort(m.colId, m.sort, true);
    });
  }

  // Filtering
  setFilterModel(model: FilterModel | null): void {
    this.filterService.filterModel.set(model ?? {});
  }
  getFilterModel(): FilterModel {
    return this.filterService.filterModel();
  }
  setQuickFilter(text: string): void {
    this.filterService.quickFilterText.set(text);
  }
  setExternalFilter(predicate: ((data: TData) => boolean) | null): void {
    this.filterService.externalPredicate.set(predicate);
  }
  onFilterChanged(): void {
    /* filters are signal-driven; kept for API parity with imperative callers */
  }

  // Selection
  selectAll(): void {
    this.selectionService.selectAll();
  }
  deselectAll(): void {
    this.selectionService.deselectAll();
  }
  getSelectedNodes(): RowNode<TData>[] {
    return this.selectionService.selectedNodes();
  }
  getSelectedRows(): TData[] {
    return this.selectionService.selectedNodes().map((n) => n.data as TData);
  }

  // Grouping / expansion
  setRowGroupColumns(colIds: string[]): void {
    for (const c of this.columnModel.columns())
      this.columnModel.setRowGroup(c.colId, colIds.includes(c.colId));
  }
  expandAll(): void {
    this.rowModel.expandAll(true);
  }
  collapseAll(): void {
    this.rowModel.expandAll(false);
  }

  // Editing
  undo(): void {
    this.editingService.undo();
  }
  redo(): void {
    this.editingService.redo();
  }
  startEditingCell(rowId: string, colId: string): void {
    const node = this.rowModel.getNodeById(rowId);
    if (node) this.editingService.startEdit(node, colId);
  }
  stopEditing(cancel = false): void {
    this.editingService.stopEdit(cancel);
  }
  startEditingRow(rowId: string): void {
    const node = this.rowModel.getNodeById(rowId);
    if (node) this.editingService.startRowEdit(node);
  }
  stopEditingRow(cancel = false): void {
    this.editingService.stopRowEdit(cancel);
  }

  // Export
  exportDataAsCsv(params?: CsvExportParams<TData>): void {
    exportToCsv(this.columnModel, this.rowModel.displayedRows(), this.valueService, params);
  }
  exportDataAsExcel(params?: ExcelExportParams<TData>): void {
    exportToExcel(this.columnModel, this.rowModel.displayedRows(), this.valueService, params);
  }
  exportDataAsPdf(params?: PdfExportParams<TData>): void {
    exportToPdf(this.columnModel, this.rowModel.displayedRows(), this.valueService, params);
  }
  copySelectedRangeToClipboard(): Promise<void> {
    return copyRangeToClipboard(
      this.columnModel,
      this.rowModel.displayedRows(),
      this.valueService,
      this.selectionService.getRangeCells(),
    );
  }
  async pasteFromClipboard(): Promise<void> {
    await pasteFromClipboard(
      this.columnModel,
      this.rowModel.displayedRows(),
      this.valueService,
      this.editingService,
      this.selectionService.getRangeCells(),
    );
  }

  // Sizing / refresh
  refreshCells(): void {
    for (const n of this.rowModel.displayedRows()) n.clearCache();
  }
}
