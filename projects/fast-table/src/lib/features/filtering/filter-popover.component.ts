import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Column } from '../../core/column';
import { FilterService } from '../../core/filter-service';
import { ClientSideRowModel } from '../../core/client-side-row-model';
import { ValueService } from '../../core/value-service';
import { OPERATORS_BY_TYPE } from '../filtering/filter-utils';
import type { FilterOperator } from '../../models/enums';
import { RELATIVE_DATE_PRESETS, type SetFilterModel } from '../../models/filter-model';

const OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: 'Indeholder',
  notContains: 'Indeholder ikke',
  equals: 'Lig med',
  notEqual: 'Forskellig fra',
  startsWith: 'Starter med',
  endsWith: 'Slutter med',
  blank: 'Er tom',
  notBlank: 'Er ikke tom',
  lessThan: 'Mindre end',
  lessThanOrEqual: 'Mindre end eller lig',
  greaterThan: 'Større end',
  greaterThanOrEqual: 'Større end eller lig',
  inRange: 'I interval',
};

@Component({
  selector: 'ft-filter-popover',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ft-filter-popover" (click)="$event.stopPropagation()">
      <div class="ft-filter-popover-tabs">
        <button class="ft-tab" [class.active]="mode() === 'simple'" (click)="mode.set('simple')">
          Filter
        </button>
        <button class="ft-tab" [class.active]="mode() === 'set'" (click)="mode.set('set')">
          Værdier
        </button>
      </div>

      @if (mode() === 'simple') {
        @if (kind() === 'date') {
          <select
            class="ft-filter-select"
            [ngModel]="operator()"
            (ngModelChange)="operator.set($event)"
          >
            @for (op of operators(); track op) {
              <option [value]="op">{{ opLabel(op) }}</option>
            }
          </select>
          <div class="ft-filter-relative">
            @for (preset of relativePresets; track preset) {
              <button
                class="ft-chip"
                [class.active]="dateFrom() === preset"
                (click)="applyRelative(preset)"
              >
                {{ preset }}
              </button>
            }
          </div>
          <input
            class="ft-filter-input"
            type="date"
            [ngModel]="dateFrom()"
            (ngModelChange)="dateFrom.set($event)"
          />
          @if (operator() === 'inRange') {
            <input
              class="ft-filter-input"
              type="date"
              [ngModel]="dateTo()"
              (ngModelChange)="dateTo.set($event)"
            />
          }
        } @else if (kind() === 'number') {
          <select
            class="ft-filter-select"
            [ngModel]="operator()"
            (ngModelChange)="operator.set($event)"
          >
            @for (op of operators(); track op) {
              <option [value]="op">{{ opLabel(op) }}</option>
            }
          </select>
          <input
            class="ft-filter-input"
            type="number"
            [ngModel]="numberValue()"
            (ngModelChange)="numberValue.set($event)"
          />
          @if (operator() === 'inRange') {
            <input
              class="ft-filter-input"
              type="number"
              [ngModel]="numberTo()"
              (ngModelChange)="numberTo.set($event)"
            />
          }
        } @else {
          <select
            class="ft-filter-select"
            [ngModel]="operator()"
            (ngModelChange)="operator.set($event)"
          >
            @for (op of operators(); track op) {
              <option [value]="op">{{ opLabel(op) }}</option>
            }
          </select>
          <input
            class="ft-filter-input"
            type="text"
            [ngModel]="textValue()"
            (ngModelChange)="textValue.set($event)"
          />
        }
        <div class="ft-filter-actions">
          <button class="ft-btn" (click)="apply()">Anvend</button>
          <button class="ft-btn ft-btn-ghost" (click)="clear()">Ryd</button>
        </div>
      } @else {
        <input
          class="ft-filter-input"
          type="text"
          placeholder="Søg..."
          [ngModel]="miniSearch()"
          (ngModelChange)="miniSearch.set($event)"
        />
        <div class="ft-set-filter-actions">
          <button class="ft-link" (click)="selectAllValues()">Vælg alle</button>
          <button class="ft-link" (click)="clearAllValues()">Ryd alle</button>
        </div>
        <div class="ft-set-filter-list">
          @for (v of filteredUniqueValues(); track v) {
            <label class="ft-set-filter-item">
              <input type="checkbox" [checked]="isValueChecked(v)" (change)="toggleValue(v)" />
              <span>{{ v }}</span>
            </label>
          }
        </div>
        <div class="ft-filter-actions">
          <button class="ft-btn" (click)="applySet()">Anvend</button>
          <button class="ft-btn ft-btn-ghost" (click)="clear()">Ryd</button>
        </div>
      }
    </div>
  `,
})
export class FilterPopoverComponent<TData = any> {
  readonly column = input.required<Column<TData>>();
  readonly closed = output<void>();

  private filterService = inject(FilterService<TData>);
  private rowModel = inject(ClientSideRowModel<TData>);
  private valueService = inject(ValueService<TData>);

  readonly relativePresets = RELATIVE_DATE_PRESETS;
  readonly mode = signal<'simple' | 'set'>('simple');
  readonly operator = signal<FilterOperator>('contains');
  readonly textValue = signal('');
  readonly numberValue = signal<number | null>(null);
  readonly numberTo = signal<number | null>(null);
  readonly dateFrom = signal('');
  readonly dateTo = signal('');
  readonly miniSearch = signal('');
  readonly checkedValues = signal<Set<string> | null>(null);

  readonly kind = computed(() => {
    const f = this.column().colDef.filter;
    if (f === 'number') return 'number';
    if (f === 'date') return 'date';
    if (f === 'set') return 'set';
    return 'text';
  });

  readonly operators = computed(
    () =>
      OPERATORS_BY_TYPE[
        this.kind() === 'set' ? 'text' : (this.kind() as 'text' | 'number' | 'date')
      ],
  );

  opLabel(op: FilterOperator): string {
    return OPERATOR_LABELS[op];
  }

  readonly uniqueValues = computed(() => {
    const col = this.column();
    const values = new Set<string>();
    for (const leaf of this.rowModel.leafNodes()) {
      const v = this.valueService.getValue(col, leaf);
      values.add(v === null || v === undefined ? '(Blanks)' : String(v));
    }
    return Array.from(values).sort();
  });

  readonly filteredUniqueValues = computed(() => {
    const q = this.miniSearch().toLowerCase();
    return this.uniqueValues().filter((v) => v.toLowerCase().includes(q));
  });

  isValueChecked(v: string): boolean {
    const set = this.checkedValues();
    if (set === null) return true;
    return set.has(v);
  }

  toggleValue(v: string): void {
    const current = this.checkedValues() ?? new Set(this.uniqueValues());
    const next = new Set(current);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    this.checkedValues.set(next);
  }

  selectAllValues(): void {
    this.checkedValues.set(new Set(this.uniqueValues()));
  }
  clearAllValues(): void {
    this.checkedValues.set(new Set());
  }

  applyRelative(preset: string): void {
    this.dateFrom.set(preset);
    this.operator.set('inRange');
  }

  apply(): void {
    const colId = this.column().colId;
    const kind = this.kind();
    if (kind === 'number') {
      this.filterService.setColumnFilter(colId, {
        filterType: 'number',
        operator: this.operator(),
        filter: this.numberValue(),
        filterTo: this.numberTo(),
      });
    } else if (kind === 'date') {
      this.filterService.setColumnFilter(colId, {
        filterType: 'date',
        operator: this.operator(),
        dateFrom: this.dateFrom() || null,
        dateTo: this.dateTo() || null,
      });
    } else {
      this.filterService.setColumnFilter(colId, {
        filterType: 'text',
        operator: this.operator(),
        filter: this.textValue(),
      });
    }
    this.closed.emit();
  }

  applySet(): void {
    const colId = this.column().colId;
    const values = Array.from(this.checkedValues() ?? new Set(this.uniqueValues()));
    const model: SetFilterModel = { filterType: 'set', values };
    this.filterService.setColumnFilter(colId, model);
    this.closed.emit();
  }

  clear(): void {
    this.filterService.setColumnFilter(this.column().colId, null);
    this.checkedValues.set(null);
    this.closed.emit();
  }
}
