import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FilterService } from '../../core/filter-service';
import { EditingService } from '../../core/editing-service';
import { ColumnModel } from '../../core/column-model';
import { FtIconComponent } from '../icon/ft-icon.component';

@Component({
  selector: 'ft-toolbar',
  standalone: true,
  imports: [FormsModule, FtIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ft-toolbar">
      <div class="ft-quick-filter-wrap">
        <ft-icon name="search" class="ft-quick-filter-icon" />
        <input
          class="ft-quick-filter-input"
          type="text"
          placeholder="Hurtig søgning..."
          [ngModel]="filterService.quickFilterText()"
          (ngModelChange)="filterService.quickFilterText.set($event)"
        />
      </div>
      <span class="ft-toolbar-spacer"></span>
      <button
        class="ft-toolbar-btn"
        (click)="editingService.undo()"
        [disabled]="!editingService.canUndo()"
        title="Fortryd"
      >
        <ft-icon name="undo" />
        <span>Fortryd</span>
      </button>
      <button
        class="ft-toolbar-btn"
        (click)="editingService.redo()"
        [disabled]="!editingService.canRedo()"
        title="Gentag"
      >
        <ft-icon name="redo" />
        <span>Gentag</span>
      </button>
      <span class="ft-toolbar-sep"></span>
      <button
        class="ft-toolbar-btn"
        [class.active]="columnModel.pivotModeSig()"
        (click)="columnModel.pivotModeSig.set(!columnModel.pivotModeSig())"
      >
        <ft-icon name="grid" />
        <span>Pivot</span>
      </button>
      <button class="ft-toolbar-btn" (click)="exportCsv.emit()">
        <ft-icon name="download" />
        <span>CSV</span>
      </button>
      <button class="ft-toolbar-btn" (click)="exportExcel.emit()">
        <ft-icon name="download" />
        <span>Excel</span>
      </button>
      <button class="ft-toolbar-btn" (click)="exportPdf.emit()">
        <ft-icon name="download" />
        <span>PDF</span>
      </button>
      <span class="ft-toolbar-sep"></span>
      <button class="ft-toolbar-btn" (click)="toggleColumns.emit()">
        <ft-icon name="columns" />
        <span>Kolonner</span>
      </button>
      <button class="ft-toolbar-btn" (click)="toggleFilters.emit()">
        <ft-icon name="filter" />
        <span>Filtre</span>
      </button>
      <button class="ft-toolbar-btn" (click)="toggleAdvancedFilter.emit()">
        <ft-icon name="zap" />
        <span>Avanceret filter</span>
      </button>
    </div>
  `,
})
export class ToolbarComponent {
  filterService = inject(FilterService);
  editingService = inject(EditingService);
  columnModel = inject(ColumnModel);

  readonly exportCsv = output<void>();
  readonly exportExcel = output<void>();
  readonly exportPdf = output<void>();
  readonly toggleColumns = output<void>();
  readonly toggleFilters = output<void>();
  readonly toggleAdvancedFilter = output<void>();
}
