export function defaultComparator(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'bigint' && typeof b === 'bigint') return a < b ? -1 : a > b ? 1 : 0;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? 1 : -1;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

export interface SortSpec<T> {
  dir: 'asc' | 'desc';
  getValue: (item: T) => unknown;
  comparator?: (a: unknown, b: unknown, itemA: T, itemB: T) => number;
}

/** Stable multi-key sort; each spec is applied in priority order until a tie breaks. */
export function multiSort<T>(items: T[], specs: SortSpec<T>[]): T[] {
  if (specs.length === 0) return items;
  const indexed = items.map((item, index) => ({ item, index }));
  indexed.sort((a, b) => {
    for (const spec of specs) {
      const va = spec.getValue(a.item);
      const vb = spec.getValue(b.item);
      const cmp = spec.comparator
        ? spec.comparator(va, vb, a.item, b.item)
        : defaultComparator(va, vb);
      if (cmp !== 0) return spec.dir === 'asc' ? cmp : -cmp;
    }
    return a.index - b.index;
  });
  return indexed.map((x) => x.item);
}
