import { Injectable, computed, signal, Signal } from '@angular/core';
import { RowNode } from '../models/row-node';
import { ColumnModel } from './column-model';
import { Column } from './column';

export interface RowLayout<TData> {
  node: RowNode<TData>;
  top: number;
  height: number;
}

export interface VisibleColRange {
  columns: Column[];
  offsetLeft: number;
}

/** Computes row top offsets, total scroll height, and the visible row/column
 *  windows for a given scroll position — the math behind virtualization. */
@Injectable()
export class ViewportModel<TData = any> {
  defaultRowHeight = 36;
  getRowHeightFn: ((node: RowNode<TData>) => number) | null = null;

  readonly scrollTop = signal(0);
  readonly scrollLeft = signal(0);
  readonly viewportHeight = signal(600);
  readonly overscanRows = signal(8);
  readonly overscanCols = signal(3);

  constructor(private columnModel: ColumnModel<TData>) {}

  buildLayout(rows: RowNode<TData>[]): RowLayout<TData>[] {
    let top = 0;
    const layout: RowLayout<TData>[] = [];
    for (const node of rows) {
      const height = this.getRowHeightFn
        ? this.getRowHeightFn(node)
        : (node.rowHeight ?? this.defaultRowHeight);
      node.rowTop = top;
      node.rowHeight = height;
      layout.push({ node, top, height });
      top += height;
    }
    return layout;
  }

  totalHeight(layout: RowLayout<TData>[]): number {
    if (layout.length === 0) return 0;
    const last = layout[layout.length - 1];
    return last.top + last.height;
  }

  visibleRowLayout(layout: RowLayout<TData>[]): RowLayout<TData>[] {
    const top = this.scrollTop();
    const height = this.viewportHeight();
    const overscan = this.overscanRows();
    if (layout.length === 0) return [];

    let lo = this.binarySearchTop(layout, top);
    lo = Math.max(0, lo - overscan);
    let hi = this.binarySearchTop(layout, top + height);
    hi = Math.min(layout.length, hi + overscan);
    return layout.slice(lo, hi);
  }

  private binarySearchTop(layout: RowLayout<TData>[], y: number): number {
    let low = 0;
    let high = layout.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (layout[mid].top < y) low = mid + 1;
      else high = mid - 1;
    }
    return low;
  }

  /** Cumulative left offsets for center (non-pinned) columns, for horizontal virtualization. */
  visibleCenterColumns(columns: Column<TData>[], viewportWidth: number): VisibleColRange {
    let left = 0;
    const offsets: number[] = [];
    for (const c of columns) {
      offsets.push(left);
      c.left = left;
      left += c.width();
    }
    const scrollLeft = this.scrollLeft();
    const overscanPx = 200;
    const from = scrollLeft - overscanPx;
    const to = scrollLeft + viewportWidth + overscanPx;

    let startIdx = 0;
    while (startIdx < columns.length && offsets[startIdx] + columns[startIdx].width() < from)
      startIdx++;
    let endIdx = startIdx;
    while (endIdx < columns.length && offsets[endIdx] < to) endIdx++;

    return { columns: columns.slice(startIdx, endIdx), offsetLeft: offsets[startIdx] ?? 0 };
  }

  onScroll(scrollTop: number, scrollLeft: number): void {
    this.scrollTop.set(scrollTop);
    this.scrollLeft.set(scrollLeft);
  }
}
