import { Component, ChangeDetectionStrategy, input, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Column } from '../../core/column';
import { FilterService } from '../../core/filter-service';

@Component({
  selector: 'ft-floating-filter',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (kind() === 'number') {
      <input
        class="ft-floating-filter-input"
        type="number"
        placeholder="Filter..."
        [ngModel]="numberValue()"
        (ngModelChange)="setNumber($event)"
      />
    } @else if (kind() === 'date') {
      <input
        class="ft-floating-filter-input"
        type="date"
        [ngModel]="dateValue()"
        (ngModelChange)="setDate($event)"
      />
    } @else {
      <input
        class="ft-floating-filter-input"
        type="text"
        placeholder="Filter..."
        [ngModel]="textValue()"
        (ngModelChange)="setText($event)"
      />
    }
  `,
})
export class FloatingFilterComponent<TData = any> {
  readonly column = input.required<Column<TData>>();
  private filterService = inject(FilterService<TData>);

  readonly kind = computed(() => {
    const f = this.column().colDef.filter;
    if (f === 'number') return 'number';
    if (f === 'date') return 'date';
    return 'text';
  });

  private currentModel = computed(() => this.filterService.filterModel()[this.column().colId]);

  textValue(): string {
    const m = this.currentModel();
    return m?.filterType === 'text' ? m.filter : '';
  }
  numberValue(): number | null {
    const m = this.currentModel();
    return m?.filterType === 'number' ? m.filter : null;
  }
  dateValue(): string {
    const m = this.currentModel();
    return m?.filterType === 'date' ? (m.dateFrom ?? '') : '';
  }

  setText(value: string): void {
    const colId = this.column().colId;
    if (!value) this.filterService.setColumnFilter(colId, null);
    else
      this.filterService.setColumnFilter(colId, {
        filterType: 'text',
        operator: 'contains',
        filter: value,
      });
  }

  setNumber(value: number | null): void {
    const colId = this.column().colId;
    if (value === null || (value as unknown as string) === '')
      this.filterService.setColumnFilter(colId, null);
    else
      this.filterService.setColumnFilter(colId, {
        filterType: 'number',
        operator: 'equals',
        filter: Number(value),
      });
  }

  setDate(value: string): void {
    const colId = this.column().colId;
    if (!value) this.filterService.setColumnFilter(colId, null);
    else
      this.filterService.setColumnFilter(colId, {
        filterType: 'date',
        operator: 'equals',
        dateFrom: value,
      });
  }
}
