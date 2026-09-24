import { Component, ChangeDetectionStrategy, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ClientSideRowModel } from '../../core/client-side-row-model';
import { SelectionService } from '../../core/selection-service';
import { ColumnModel } from '../../core/column-model';
import { ValueService } from '../../core/value-service';

@Component({
  selector: 'ft-status-bar',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ft-status-bar">
      <div class="ft-status-bar-left">
        <span class="ft-status-item">Rækker: {{ totalRows() }}</span>
        @if (selectedCount() > 0) {
          <span class="ft-status-item">Valgt: {{ selectedCount() }}</span>
        }
      </div>
      <div class="ft-status-bar-right">
        @if (rangeStats(); as stats) {
          <span class="ft-status-item">Sum: {{ stats.sum | number: '1.0-2' }}</span>
          <span class="ft-status-item">Gns: {{ stats.avg | number: '1.0-2' }}</span>
          <span class="ft-status-item">Antal: {{ stats.count }}</span>
          <span class="ft-status-item">Min: {{ stats.min | number: '1.0-2' }}</span>
          <span class="ft-status-item">Maks: {{ stats.max | number: '1.0-2' }}</span>
        }
      </div>
    </div>
  `,
})
export class StatusBarComponent<TData = any> {
  private rowModel = inject(ClientSideRowModel<TData>);
  private selectionService = inject(SelectionService<TData>);
  private columnModel = inject(ColumnModel<TData>);
  private valueService = inject(ValueService<TData>);

  readonly totalRows = computed(() => this.rowModel.rowCount());
  readonly selectedCount = computed(() => this.selectionService.selectedCount());

  readonly rangeStats = computed(() => {
    const cells = this.selectionService.getRangeCells();
    if (cells.length === 0) return null;
    const rows = this.rowModel.displayedRows();
    const nums: number[] = [];
    for (const cell of cells) {
      const node = rows[cell.rowIndex];
      const col = this.columnModel.getColumn(cell.colId);
      if (!node || !col) continue;
      const v = this.valueService.getValue(col, node);
      if (typeof v === 'number') nums.push(v);
    }
    if (nums.length === 0) return null;
    const sum = nums.reduce((a, b) => a + b, 0);
    return {
      sum,
      avg: sum / nums.length,
      count: nums.length,
      min: Math.min(...nums),
      max: Math.max(...nums),
    };
  });
}
