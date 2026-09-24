import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ColumnModel } from '../../core/column-model';
import { inject } from '@angular/core';
import { FtIconComponent } from '../../components/icon/ft-icon.component';
import type { AdvancedFilterGroup, AdvancedFilterCondition } from '../../models/filter-model';
import type { FilterOperator, JoinOperator } from '../../models/enums';

function newCondition(colId: string): AdvancedFilterCondition {
  return { type: 'condition', colId, operator: 'contains', value: '' };
}

function newGroup(): AdvancedFilterGroup {
  return { type: 'group', join: 'AND', conditions: [] };
}

@Component({
  selector: 'ft-advanced-filter-group',
  standalone: true,
  imports: [FormsModule, FtIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ft-adv-filter-group">
      <div class="ft-adv-filter-group-header">
        <select class="ft-filter-select" [(ngModel)]="group().join" (ngModelChange)="emitChange()">
          <option value="AND">Alle (OG)</option>
          <option value="OR">Enhver (ELLER)</option>
        </select>
        <button class="ft-link" (click)="addCondition()"><ft-icon name="plus" />Betingelse</button>
        <button class="ft-link" (click)="addGroup()"><ft-icon name="plus" />Gruppe</button>
        @if (removable()) {
          <button class="ft-link ft-link-danger" (click)="remove.emit()">Fjern gruppe</button>
        }
      </div>
      <div class="ft-adv-filter-conditions">
        @for (cond of group().conditions; track $index) {
          @if (cond.type === 'condition') {
            <div class="ft-adv-filter-condition">
              <select
                class="ft-filter-select"
                [(ngModel)]="cond.colId"
                (ngModelChange)="emitChange()"
              >
                @for (col of columnModel.columns(); track col.colId) {
                  <option [value]="col.colId">{{ col.headerName() }}</option>
                }
              </select>
              <select
                class="ft-filter-select"
                [(ngModel)]="cond.operator"
                (ngModelChange)="emitChange()"
              >
                @for (op of operators; track op) {
                  <option [value]="op">{{ op }}</option>
                }
              </select>
              <input
                class="ft-filter-input"
                type="text"
                [(ngModel)]="cond.value"
                (ngModelChange)="emitChange()"
              />
              <button
                class="ft-link ft-link-danger ft-condition-remove"
                (click)="removeAt($index)"
                title="Fjern betingelse"
              >
                <ft-icon name="x" />
              </button>
            </div>
          } @else {
            <ft-advanced-filter-group
              [group]="cond"
              [removable]="true"
              (changed)="emitChange()"
              (remove)="removeAt($index)"
            />
          }
        }
      </div>
    </div>
  `,
})
export class AdvancedFilterGroupComponent {
  readonly group = input.required<AdvancedFilterGroup>();
  readonly removable = input<boolean>(false);
  readonly changed = output<void>();
  readonly remove = output<void>();

  columnModel = inject(ColumnModel);

  readonly operators: FilterOperator[] = [
    'contains',
    'notContains',
    'equals',
    'notEqual',
    'startsWith',
    'endsWith',
    'greaterThan',
    'lessThan',
  ];

  addCondition(): void {
    const firstCol = this.columnModel.columns()[0]?.colId ?? '';
    this.group().conditions.push(newCondition(firstCol));
    this.emitChange();
  }

  addGroup(): void {
    this.group().conditions.push(newGroup());
    this.emitChange();
  }

  removeAt(index: number): void {
    this.group().conditions.splice(index, 1);
    this.emitChange();
  }

  emitChange(): void {
    this.changed.emit();
  }
}

@Component({
  selector: 'ft-advanced-filter-builder',
  standalone: true,
  imports: [AdvancedFilterGroupComponent, FtIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ft-adv-filter-panel">
      <div class="ft-adv-filter-panel-header">
        <h4 class="ft-adv-filter-title">Avanceret filter</h4>
        <button class="ft-chart-close" (click)="closed.emit()" title="Luk">
          <ft-icon name="x" />
        </button>
      </div>
      <ft-advanced-filter-group [group]="model()" (changed)="apply.emit(model())" />
      <div class="ft-filter-actions">
        <button class="ft-btn" (click)="apply.emit(model())">Anvend</button>
        <button class="ft-btn ft-btn-ghost" (click)="cleared.emit()">Ryd</button>
      </div>
    </div>
  `,
})
export class AdvancedFilterBuilderComponent {
  readonly model = input.required<AdvancedFilterGroup>();
  readonly apply = output<AdvancedFilterGroup>();
  readonly cleared = output<void>();
  readonly closed = output<void>();
}

export { newGroup as createEmptyAdvancedFilterGroup };
