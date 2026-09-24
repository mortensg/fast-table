import { Injectable, signal } from '@angular/core';
import { RowNode } from '../models/row-node';
import { ColumnModel } from './column-model';
import { ValueService } from './value-service';
import type { ValidatorFn } from '../models/column-def';

export interface EditingCell {
  node: RowNode;
  colId: string;
  fullRow: boolean;
}

interface UndoEntry {
  changes: { node: RowNode; colId: string; oldValue: unknown; newValue: unknown }[];
}

export type CellValueChangedListener = (evt: {
  node: RowNode;
  colId: string;
  oldValue: unknown;
  newValue: unknown;
  source: string;
}) => void;

/** Drives cell/full-row editing, validation, and an undo/redo history stack. */
@Injectable()
export class EditingService<TData = any> {
  readonly editingCell = signal<EditingCell | null>(null);
  readonly editingRowId = signal<string | null>(null);
  readonly validationErrors = signal<Map<string, string>>(new Map());

  undoRedoEnabled = true;
  undoLimit = 100;
  private undoStack: UndoEntry[] = [];
  private redoStack: UndoEntry[] = [];
  private listeners: CellValueChangedListener[] = [];

  constructor(
    private columnModel: ColumnModel<TData>,
    private valueService: ValueService<TData>,
  ) {}

  onCellValueChanged(fn: CellValueChangedListener): () => void {
    this.listeners.push(fn);
    return () => (this.listeners = this.listeners.filter((l) => l !== fn));
  }

  private emit(
    node: RowNode,
    colId: string,
    oldValue: unknown,
    newValue: unknown,
    source: string,
  ): void {
    for (const l of this.listeners) l({ node, colId, oldValue, newValue, source });
  }

  private rowEditSnapshot: { node: RowNode; data: unknown } | null = null;

  startEdit(node: RowNode, colId: string, fullRow = false): void {
    this.editingCell.set({ node, colId, fullRow });
    if (fullRow) this.startRowEdit(node);
  }

  startRowEdit(node: RowNode): void {
    this.rowEditSnapshot = {
      node,
      data: node.data !== undefined ? { ...(node.data as object) } : undefined,
    };
    this.editingRowId.set(node.id);
  }

  stopEdit(cancel = false): void {
    this.editingCell.set(null);
  }

  stopRowEdit(cancel = false): void {
    if (cancel && this.rowEditSnapshot && this.rowEditSnapshot.data !== undefined) {
      this.rowEditSnapshot.node.setData(this.rowEditSnapshot.data as any);
    }
    this.rowEditSnapshot = null;
    this.editingRowId.set(null);
    this.editingCell.set(null);
  }

  validate(colId: string, node: RowNode<TData>, value: unknown): string | null {
    const col = this.columnModel.getColumn(colId);
    if (!col?.colDef.validators) return null;
    for (const validator of col.colDef.validators as ValidatorFn<TData>[]) {
      const error = validator({ value, data: node.data, node, colDef: col.colDef });
      if (error) return error;
    }
    return null;
  }

  commitValue(
    node: RowNode<TData>,
    colId: string,
    newValue: unknown,
    source: 'edit' | 'paste' | 'fill' | 'topDown' = 'edit',
  ): boolean {
    const col = this.columnModel.getColumn(colId);
    if (!col) return false;
    const error = this.validate(colId, node, newValue);
    const errKey = `${node.id}:${colId}`;
    const errs = new Map(this.validationErrors());
    if (error) {
      errs.set(errKey, error);
      this.validationErrors.set(errs);
      return false;
    }
    errs.delete(errKey);
    this.validationErrors.set(errs);

    const oldValue = this.valueService.getValue(col, node);
    if (oldValue === newValue) return true;
    const ok = this.valueService.setValue(col, node, newValue);
    if (!ok) return false;

    if (this.undoRedoEnabled && source !== 'topDown') {
      this.pushUndo({ changes: [{ node, colId, oldValue, newValue }] });
    }
    this.emit(node, colId, oldValue, newValue, source);
    return true;
  }

  commitBatch(
    changes: { node: RowNode<TData>; colId: string; newValue: unknown }[],
    source: 'paste' | 'fill' = 'paste',
  ): void {
    const undoChanges: UndoEntry['changes'] = [];
    for (const change of changes) {
      const col = this.columnModel.getColumn(change.colId);
      if (!col) continue;
      const oldValue = this.valueService.getValue(col, change.node);
      if (this.validate(change.colId, change.node, change.newValue)) continue;
      const ok = this.valueService.setValue(col, change.node, change.newValue);
      if (!ok) continue;
      undoChanges.push({
        node: change.node,
        colId: change.colId,
        oldValue,
        newValue: change.newValue,
      });
      this.emit(change.node, change.colId, oldValue, change.newValue, source);
    }
    if (this.undoRedoEnabled && undoChanges.length) this.pushUndo({ changes: undoChanges });
  }

  private pushUndo(entry: UndoEntry): void {
    this.undoStack.push(entry);
    if (this.undoStack.length > this.undoLimit) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(): void {
    const entry = this.undoStack.pop();
    if (!entry) return;
    for (const change of entry.changes) {
      const col = this.columnModel.getColumn(change.colId);
      if (!col) continue;
      this.valueService.setValue(col, change.node, change.oldValue);
      this.emit(change.node, change.colId, change.newValue, change.oldValue, 'undo');
    }
    this.redoStack.push(entry);
  }

  redo(): void {
    const entry = this.redoStack.pop();
    if (!entry) return;
    for (const change of entry.changes) {
      const col = this.columnModel.getColumn(change.colId);
      if (!col) continue;
      this.valueService.setValue(col, change.node, change.newValue);
      this.emit(change.node, change.colId, change.oldValue, change.newValue, 'redo');
    }
    this.undoStack.push(entry);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Distributes a delta from editing a group's aggregated sum proportionally to leaf rows. */
  topDownGroupEdit(groupNode: RowNode<TData>, colId: string, newAggValue: number): void {
    const col = this.columnModel.getColumn(colId);
    if (!col) return;
    const leaves = groupNode.allLeafChildren;
    const oldAgg = (groupNode.aggData[colId] as number) ?? 0;
    const delta = newAggValue - oldAgg;
    if (leaves.length === 0) return;
    const oldValues = leaves.map((l) => Number(this.valueService.getValue(col, l)) || 0);
    const total = oldValues.reduce((a, b) => a + b, 0);
    leaves.forEach((leaf, i) => {
      const share = total === 0 ? delta / leaves.length : delta * (oldValues[i] / total);
      this.commitValue(leaf, colId, oldValues[i] + share, 'topDown');
    });
  }
}
