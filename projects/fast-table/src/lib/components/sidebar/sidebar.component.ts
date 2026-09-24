import { Component, ChangeDetectionStrategy, input, output, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColumnModel } from '../../core/column-model';
import { FilterService } from '../../core/filter-service';
import { Column } from '../../core/column';
import { FtIconComponent } from '../icon/ft-icon.component';

@Component({
  selector: 'ft-sidebar',
  standalone: true,
  imports: [FormsModule, FtIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ft-sidebar">
      @if (panel() === 'columns') {
        <div class="ft-sidebar-panel">
          <h4 class="ft-sidebar-title">Kolonner</h4>
          <div class="ft-sidebar-col-list">
            @for (col of columnModel.columns(); track col.colId; let i = $index) {
              <div class="ft-sidebar-col-row" [style.--ft-i]="i">
                <label class="ft-sidebar-col-label">
                  <input
                    type="checkbox"
                    [checked]="!col.hide()"
                    (change)="columnModel.setVisible(col.colId, !col.hide())"
                  />
                  <span>{{ col.headerName() }}</span>
                </label>
                <div class="ft-sidebar-col-actions">
                  <button
                    class="ft-chip"
                    [class.active]="col.rowGroupActive()"
                    title="Rækkegruppering"
                    (click)="columnModel.setRowGroup(col.colId, !col.rowGroupActive())"
                  >
                    <ft-icon name="grid" />
                    Gruppe
                  </button>
                  <button
                    class="ft-chip"
                    [class.active]="col.pivotActive()"
                    title="Pivot"
                    (click)="columnModel.setPivot(col.colId, !col.pivotActive())"
                  >
                    <ft-icon name="columns" />
                    Pivot
                  </button>
                  <select
                    class="ft-chip-select"
                    [ngModel]="col.aggFunc() ?? ''"
                    (ngModelChange)="setAgg(col, $event)"
                  >
                    <option value="">Ingen agg.</option>
                    <option value="sum">Sum</option>
                    <option value="avg">Gns</option>
                    <option value="min">Min</option>
                    <option value="max">Maks</option>
                    <option value="count">Antal</option>
                    <option value="first">Første</option>
                    <option value="last">Sidste</option>
                  </select>
                </div>
              </div>
            }
          </div>
        </div>
      } @else if (panel() === 'filters') {
        <div class="ft-sidebar-panel">
          <h4 class="ft-sidebar-title">Filtre</h4>
          <button
            class="ft-btn ft-btn-ghost ft-sidebar-clear-btn"
            (click)="filterService.clearAllFilters()"
          >
            Ryd alle filtre
          </button>
          <div class="ft-sidebar-filter-list">
            @for (col of filterableColumns(); track col.colId; let i = $index) {
              <div class="ft-sidebar-filter-row" [style.--ft-i]="i">
                <span>{{ col.headerName() }}</span>
                @if (activeFilterSummary(col.colId); as summary) {
                  <span class="ft-filter-summary">{{ summary }}</span>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class SidebarComponent<TData = any> {
  readonly panel = input<'columns' | 'filters' | null>(null);

  columnModel = inject(ColumnModel<TData>);
  filterService = inject(FilterService<TData>);

  readonly filterableColumns = computed(() =>
    this.columnModel.columns().filter((c) => c.isFilterable()),
  );

  setAgg(col: Column<TData>, value: string): void {
    this.columnModel.setAggFunc(col.colId, value || null);
  }

  activeFilterSummary(colId: string): string | null {
    const model = this.filterService.filterModel()[colId];
    if (!model) return null;
    if (model.filterType === 'text') return `${model.operator}: ${model.filter}`;
    if (model.filterType === 'number') return `${model.operator}: ${model.filter}`;
    if (model.filterType === 'date') return `${model.operator}: ${model.dateFrom}`;
    if (model.filterType === 'set') return `${model.values.length} valgt`;
    return 'aktiv';
  }
}
