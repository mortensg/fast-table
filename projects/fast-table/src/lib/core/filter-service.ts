import { Injectable, computed, signal } from '@angular/core';
import type {
  FilterModel,
  AdvancedFilterModel,
  AdvancedFilterGroup,
  AdvancedFilterCondition,
} from '../models/filter-model';
import { matchesColumnFilter } from '../features/filtering/filter-utils';
import { ColumnModel } from './column-model';
import { ValueService } from './value-service';
import { RowNode } from '../models/row-node';

/** Owns column filter models, quick filter text, advanced filter tree, and the
 *  combined predicate the row model uses to test each leaf row. */
@Injectable()
export class FilterService<TData = any> {
  readonly filterModel = signal<FilterModel>({});
  readonly quickFilterText = signal<string>('');
  readonly advancedFilterModel = signal<AdvancedFilterModel | null>(null);
  readonly externalPredicate = signal<((data: TData) => boolean) | null>(null);

  constructor(
    private columnModel: ColumnModel<TData>,
    private valueService: ValueService<TData>,
  ) {}

  setColumnFilter(colId: string, model: FilterModel[string] | null): void {
    const current = { ...this.filterModel() };
    if (model === null) delete current[colId];
    else current[colId] = model;
    this.filterModel.set(current);
  }

  clearAllFilters(): void {
    this.filterModel.set({});
    this.advancedFilterModel.set(null);
  }

  readonly hasActiveFilters = computed(
    () =>
      Object.keys(this.filterModel()).length > 0 ||
      this.quickFilterText().trim() !== '' ||
      !!this.advancedFilterModel(),
  );

  buildPredicate(): (node: RowNode<TData>) => boolean {
    const colFilters = this.filterModel();
    const quick = this.quickFilterText().trim().toLowerCase();
    const advanced = this.advancedFilterModel();
    const external = this.externalPredicate();
    const cols = this.columnModel.columns();

    return (node: RowNode<TData>): boolean => {
      if (node.data === undefined) return true;
      if (external && !external(node.data)) return false;

      for (const colId of Object.keys(colFilters)) {
        const col = this.columnModel.getColumn(colId);
        if (!col) continue;
        const value = this.valueService.getValue(col, node);
        if (!matchesColumnFilter(value, colFilters[colId])) return false;
      }

      if (quick) {
        const anyMatch = cols.some((c) => {
          if (c.hide()) return false;
          const v = this.valueService.getFormattedValue(c, node);
          return v.toLowerCase().includes(quick);
        });
        if (!anyMatch) return false;
      }

      if (advanced && !this.evalAdvanced(advanced, node)) return false;

      return true;
    };
  }

  private evalAdvanced(group: AdvancedFilterGroup, node: RowNode<TData>): boolean {
    const results = group.conditions.map((c) =>
      c.type === 'group' ? this.evalAdvanced(c, node) : this.evalCondition(c, node),
    );
    return group.join === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }

  private evalCondition(cond: AdvancedFilterCondition, node: RowNode<TData>): boolean {
    const col = this.columnModel.getColumn(cond.colId);
    if (!col) return true;
    const value = this.valueService.getValue(col, node);
    return (
      matchesColumnFilter(value, {
        filterType: 'text',
        operator: cond.operator,
        filter: String(cond.value ?? ''),
      } as any) || this.compareGeneric(value, cond)
    );
  }

  private compareGeneric(value: unknown, cond: AdvancedFilterCondition): boolean {
    const n = typeof value === 'number' ? value : Number(value);
    const target = Number(cond.value);
    switch (cond.operator) {
      case 'greaterThan':
        return n > target;
      case 'lessThan':
        return n < target;
      case 'equals':
        return value === cond.value;
      default:
        return false;
    }
  }
}
