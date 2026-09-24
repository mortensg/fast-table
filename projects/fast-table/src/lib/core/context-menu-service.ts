import { Injectable, signal } from '@angular/core';
import { RowNode } from '../models/row-node';

export interface ContextMenuState<TData = any> {
  x: number;
  y: number;
  node: RowNode<TData>;
  colId: string;
}

/** Holds the currently-open context menu's position/target so ft-cell (which
 *  triggers it) and ft-table (which renders + dispatches it) don't need a
 *  prop-drilled output chain through ft-row. */
@Injectable()
export class ContextMenuService<TData = any> {
  readonly state = signal<ContextMenuState<TData> | null>(null);

  open(x: number, y: number, node: RowNode<TData>, colId: string): void {
    this.state.set({ x, y, node, colId });
  }

  close(): void {
    this.state.set(null);
  }
}
