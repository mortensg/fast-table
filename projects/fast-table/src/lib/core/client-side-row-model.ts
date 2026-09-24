import { Injectable, computed, signal, untracked, Signal, WritableSignal } from '@angular/core';
import { RowNode } from '../models/row-node';
import { ColumnModel } from './column-model';
import { ValueService } from './value-service';
import { FilterService } from './filter-service';
import { multiSort, defaultComparator, SortSpec } from '../features/sorting/comparators';
import { resolveAggFunc } from '../features/grouping/aggregation';
import type { GetRowIdFn, GetDataPathFn } from '../models/grid-options';
import { Column } from './column';

export type RowPinnedPriorityGetter<TData> = (
  data: TData,
) => { side: 'top' | 'bottom'; priority: number } | null;

/** In-memory row model: owns the group -> filter -> sort -> aggregate -> flatten
 *  pipeline as chained computed signals, so any input change (data, filters,
 *  sort, grouping) recomputes only what's downstream of it. */
@Injectable()
export class ClientSideRowModel<TData = any> {
  private readonly rowDataSig: WritableSignal<TData[]> = signal([]);
  private readonly pinnedTopSig: WritableSignal<TData[]> = signal([]);
  private readonly pinnedBottomSig: WritableSignal<TData[]> = signal([]);
  private nodeCache = new Map<string, RowNode<TData>>();

  getRowId: GetRowIdFn<TData> | undefined;
  getDataPath: GetDataPathFn<TData> | undefined;
  readonly treeData = signal(false);
  groupDefaultExpanded = 0;
  readonly pivotMode = signal(false);
  pinnedRowPriorityGetter: RowPinnedPriorityGetter<TData> | null = null;

  constructor(
    private columnModel: ColumnModel<TData>,
    private valueService: ValueService<TData>,
    private filterService: FilterService<TData>,
  ) {}

  setRowData(data: TData[]): void {
    this.rowDataSig.set(data);
  }

  getRowDataSnapshot(): TData[] {
    return this.rowDataSig();
  }

  /** Reorders the underlying row data array by node id — used by row drag-and-drop.
   *  Matches by data object identity (via the node cache) rather than recomputed
   *  ids, since the fallback id embeds array index and would shift mid-splice. */
  moveRowByNodeId(sourceId: string, targetId: string, position: 'before' | 'after'): void {
    const sourceData = this.nodeCache.get(sourceId)?.data;
    const targetData = this.nodeCache.get(targetId)?.data;
    if (sourceData === undefined || targetData === undefined || sourceData === targetData) return;
    const data = [...this.rowDataSig()];
    const sourceIdx = data.indexOf(sourceData);
    if (sourceIdx === -1) return;
    data.splice(sourceIdx, 1);
    let insertAt = data.indexOf(targetData);
    if (insertAt === -1) return;
    insertAt = position === 'after' ? insertAt + 1 : insertAt;
    data.splice(insertAt, 0, sourceData);
    this.rowDataSig.set(data);
  }

  setPinnedTopRowData(data: TData[]): void {
    this.pinnedTopSig.set(data);
  }

  setPinnedBottomRowData(data: TData[]): void {
    this.pinnedBottomSig.set(data);
  }

  applyTransaction(txn: { add?: TData[]; update?: TData[]; remove?: TData[] }): void {
    let data = [...this.rowDataSig()];
    if (txn.remove?.length) {
      const removeIds = new Set(txn.remove.map((d, i) => this.makeId(d, i)));
      data = data.filter((d, i) => !removeIds.has(this.makeId(d, i)));
    }
    if (txn.update?.length) {
      const updateMap = new Map(txn.update.map((d) => [this.makeId(d, -1), d]));
      data = data.map((d, i) => {
        const id = this.makeId(d, i);
        return updateMap.has(id) ? updateMap.get(id)! : d;
      });
    }
    if (txn.add?.length) {
      data = [...data, ...txn.add];
    }
    this.rowDataSig.set(data);
  }

  private makeId(data: TData, fallbackIndex: number): string {
    if (this.getRowId) return this.getRowId({ data });
    return `row-${fallbackIndex}-${JSON.stringify(data)}`;
  }

  private getOrCreateNode(
    data: TData,
    id: string,
    level: number,
    parent: RowNode<TData> | null,
  ): RowNode<TData> {
    let node = this.nodeCache.get(id);
    if (node) {
      node.setData(data);
      node.level = level;
      node.parent = parent;
    } else {
      node = new RowNode<TData>({ id, data, level, parent });
      this.nodeCache.set(id, node);
    }
    return node;
  }

  readonly leafNodes: Signal<RowNode<TData>[]> = computed(() => {
    const data = this.rowDataSig();
    const seen = new Set<string>();
    const nodes = data.map((d, i) => {
      const id = this.makeId(d, i);
      seen.add(id);
      return this.getOrCreateNode(d, id, 0, null);
    });
    for (const key of Array.from(this.nodeCache.keys())) {
      if (!seen.has(key) && !key.startsWith('group:') && !key.startsWith('filler:'))
        this.nodeCache.delete(key);
    }
    return nodes;
  });

  /** Group / tree stage: produces the top-level roots (either leaves, row-groups, or tree roots). */
  readonly groupedRoots: Signal<RowNode<TData>[]> = computed(() => {
    const leaves = this.leafNodes();
    if (this.treeData() && this.getDataPath) {
      return this.buildTree(leaves);
    }
    const groupCols = this.columnModel.rowGroupColumns();
    if (groupCols.length > 0) {
      return this.buildGroupLevel(leaves, groupCols, 0, null, '');
    }
    for (const l of leaves) l.childrenAfterGroup = [];
    return leaves;
  });

  private buildTree(leaves: RowNode<TData>[]): RowNode<TData>[] {
    const root = new Map<string, RowNode<TData>>();
    const order: string[] = [];
    const ensurePath = (path: string[]): RowNode<TData> => {
      let currentMap = root;
      let node: RowNode<TData> | undefined;
      let parent: RowNode<TData> | null = null;
      let acc = '';
      for (let i = 0; i < path.length; i++) {
        acc = acc ? `${acc}/${path[i]}` : path[i];
        const key = `filler:${acc}`;
        node = this.nodeCache.get(key);
        if (!node) {
          node = new RowNode<TData>({
            id: key,
            data: undefined,
            level: i,
            parent,
            group: true,
            key: path[i],
          });
          node.isFillerNode = true;
          if (this.groupDefaultExpanded === -1 || i < this.groupDefaultExpanded)
            untracked(() => node!.setExpanded(true));
          this.nodeCache.set(key, node);
        } else {
          node.level = i;
          node.parent = parent;
        }
        if (i === 0 && !order.includes(acc)) order.push(acc);
        parent = node;
      }
      return node!;
    };

    const parentOf = new Map<string, RowNode<TData>[]>();
    for (const leaf of leaves) {
      const path = this.getDataPath!(leaf.data as TData);
      leaf.level = path.length - 1;
      if (path.length === 1) {
        parentOf.set('', [...(parentOf.get('') ?? []), leaf]);
        leaf.parent = null;
        if (!order.includes(leaf.id)) order.push(leaf.id);
        continue;
      }
      const parentPath = path.slice(0, -1);
      const parentNode = ensurePath(parentPath);
      leaf.parent = parentNode;
      leaf.key = path[path.length - 1];
      const acc = parentPath.join('/');
      parentOf.set(acc, [...(parentOf.get(acc) ?? []), leaf]);
    }

    // attach children based on collected filler nodes, deepest first so a
    // parent's allLeafChildren flatMap sees its children's already-computed lists
    const allFillers = Array.from(this.nodeCache.values())
      .filter((n) => n.isFillerNode)
      .sort((a, b) => b.level - a.level);
    for (const filler of allFillers) {
      const acc = this.pathOf(filler);
      const directChildren: RowNode<TData>[] = [];
      for (const l of parentOf.get(acc) ?? []) directChildren.push(l);
      for (const f of allFillers) {
        if (f !== filler && f.parent === filler) directChildren.push(f);
      }
      filler.childrenAfterGroup = directChildren;
      filler.allLeafChildren = directChildren.flatMap((c) => (c.group ? c.allLeafChildren : [c]));
    }
    const topLevel: RowNode<TData>[] = [];
    for (const l of parentOf.get('') ?? []) topLevel.push(l);
    for (const f of allFillers) if (f.level === 0) topLevel.push(f);
    return topLevel;
  }

  private pathOf(node: RowNode<TData>): string {
    const parts: string[] = [];
    let cur: RowNode<TData> | null = node;
    while (cur) {
      if (cur.key) parts.unshift(cur.key);
      cur = cur.parent;
    }
    return parts.join('/');
  }

  private buildGroupLevel(
    items: RowNode<TData>[],
    groupCols: Column<TData>[],
    depth: number,
    parent: RowNode<TData> | null,
    pathPrefix: string,
  ): RowNode<TData>[] {
    if (depth >= groupCols.length) {
      for (const item of items) item.parent = parent;
      return items;
    }
    const col = groupCols[depth];
    const buckets = new Map<string, RowNode<TData>[]>();
    for (const item of items) {
      const raw = this.valueService.getValue(col, item);
      const key = raw === null || raw === undefined ? '(Blanks)' : String(raw);
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(item);
    }
    const groups: RowNode<TData>[] = [];
    for (const [key, groupItems] of buckets) {
      const path = `${pathPrefix}${col.colId}=${key}`;
      const id = `group:${path}`;
      let groupNode = this.nodeCache.get(id);
      if (!groupNode) {
        groupNode = new RowNode<TData>({
          id,
          data: undefined,
          level: depth,
          parent,
          group: true,
          field: col.field,
          key,
        });
        if (this.groupDefaultExpanded === -1 || depth < this.groupDefaultExpanded)
          untracked(() => groupNode!.setExpanded(true));
        this.nodeCache.set(id, groupNode);
      } else {
        groupNode.parent = parent;
        groupNode.level = depth;
      }
      groupNode.allLeafChildren = groupItems;
      groupNode.childrenAfterGroup = this.buildGroupLevel(
        groupItems,
        groupCols,
        depth + 1,
        groupNode,
        `${path}/`,
      );
      groups.push(groupNode);
    }
    return groups;
  }

  /** Filter stage: recursively filters leaves and prunes groups with no surviving descendants. */
  readonly filteredRoots: Signal<RowNode<TData>[]> = computed(() => {
    const roots = this.groupedRoots();
    const predicate = this.filterService.buildPredicate();
    const filterNode = (node: RowNode<TData>): boolean => {
      if (!node.group) {
        const keep = predicate(node);
        node.childrenAfterFilter = [];
        return keep;
      }
      const kept = node.childrenAfterGroup.filter((child) => filterNode(child));
      node.childrenAfterFilter = kept;
      return kept.length > 0;
    };
    return roots.filter((r) => filterNode(r));
  });

  /** Sort stage: recursively sorts each level's children by active multi-column sort. */
  readonly sortedRoots: Signal<RowNode<TData>[]> = computed(() => {
    const roots = this.filteredRoots();
    const activeSorts = this.columnModel.activeSorts();
    const specs: SortSpec<RowNode<TData>>[] = activeSorts.map((col) => ({
      dir: col.sort() as 'asc' | 'desc',
      getValue: (node) => this.valueService.getValue(col, node),
      comparator: col.colDef.comparator
        ? (a, b, na, nb) => col.colDef.comparator!(a, b, na, nb)
        : undefined,
    }));

    const sortLevel = (nodes: RowNode<TData>[]): RowNode<TData>[] => {
      const { pinned, normal } = this.partitionPinned(nodes);
      const sortedNormal = specs.length ? multiSort(normal, specs) : normal;
      const combined = [...pinned, ...sortedNormal];
      for (const n of combined) {
        if (n.group) {
          n.childrenAfterSort = sortLevel(n.childrenAfterFilter);
        }
      }
      return combined;
    };
    return sortLevel(roots);
  });

  private partitionPinned(nodes: RowNode<TData>[]): {
    pinned: RowNode<TData>[];
    normal: RowNode<TData>[];
  } {
    if (!this.pinnedRowPriorityGetter) return { pinned: [], normal: nodes };
    const top: { n: RowNode<TData>; p: number }[] = [];
    const bottom: { n: RowNode<TData>; p: number }[] = [];
    const normal: RowNode<TData>[] = [];
    for (const n of nodes) {
      const info = n.data !== undefined ? this.pinnedRowPriorityGetter(n.data) : null;
      if (info?.side === 'top') top.push({ n, p: info.priority });
      else if (info?.side === 'bottom') bottom.push({ n, p: info.priority });
      else normal.push(n);
    }
    top.sort((a, b) => a.p - b.p);
    bottom.sort((a, b) => a.p - b.p);
    return { pinned: [...top.map((x) => x.n), ...bottom.map((x) => x.n)], normal };
  }

  /** Aggregation stage: bottom-up computes aggData on group nodes for active value columns. */
  /** Wired by the table component to PivotService.computePivotAggregates —
   *  kept as an injected callback rather than a constructor dependency to avoid
   *  a ClientSideRowModel <-> PivotService circular DI dependency. */
  pivotAggregator: ((node: RowNode<TData>) => void) | null = null;

  readonly aggregatedRoots: Signal<RowNode<TData>[]> = computed(() => {
    const roots = this.sortedRoots();
    const valueCols = this.columnModel.valueColumns();
    const pivotMode = this.pivotMode();
    const aggregate = (node: RowNode<TData>): void => {
      if (!node.group) return;
      for (const child of node.childrenAfterSort) aggregate(child);
      const agg: Record<string, unknown> = {};
      for (const col of valueCols) {
        const fn = resolveAggFunc(col.aggFunc() as any);
        if (!fn) continue;
        const values = node.allLeafChildren.map((leaf) => this.valueService.getValue(col, leaf));
        agg[col.colId] = fn({ values });
      }
      node.aggData = agg;
      if (pivotMode && this.pivotAggregator) this.pivotAggregator(node);
      node.clearCache();
    };
    for (const r of roots) aggregate(r);
    return roots;
  });

  readonly grandTotals: Signal<Record<string, unknown>> = computed(() => {
    const leaves = this.leafNodes();
    const valueCols = this.columnModel.valueColumns();
    const result: Record<string, unknown> = {};
    for (const col of valueCols) {
      const fn = resolveAggFunc(col.aggFunc() as any);
      if (!fn) continue;
      result[col.colId] = fn({ values: leaves.map((l) => this.valueService.getValue(col, l)) });
    }
    return result;
  });

  masterDetailEnabled = signal(false);
  detailRowHeight = 240;

  /** Flattens the tree into the flat list the viewport renders, honoring expansion. */
  readonly displayedRows: Signal<RowNode<TData>[]> = computed(() => {
    const roots = this.aggregatedRoots();
    const masterDetail = this.masterDetailEnabled();
    const out: RowNode<TData>[] = [];
    const walk = (nodes: RowNode<TData>[]): void => {
      for (const node of nodes) {
        out.push(node);
        if (node.group && node.expanded()) {
          walk(node.childrenAfterSort);
        } else if (masterDetail && !node.group && node.detailExpanded()) {
          out.push(this.getOrCreateDetailNode(node));
        }
      }
    };
    walk(roots);
    out.forEach((n, i) => (n.rowIndex = i));
    return out;
  });

  private getOrCreateDetailNode(master: RowNode<TData>): RowNode<TData> {
    const id = `detail:${master.id}`;
    let node = this.nodeCache.get(id);
    if (!node) {
      node = new RowNode<TData>({
        id,
        data: undefined,
        level: master.level,
        parent: master.parent,
      });
      node.isDetailRow = true;
      node.masterNode = master;
      this.nodeCache.set(id, node);
    }
    node.rowHeight = this.detailRowHeight;
    return node;
  }

  readonly pinnedTopNodes: Signal<RowNode<TData>[]> = computed(() =>
    this.pinnedTopSig().map((d, i) => {
      const node = this.getOrCreateNode(d, `pinned-top-${i}`, 0, null);
      untracked(() => node.rowPinned.set('top'));
      return node;
    }),
  );

  readonly pinnedBottomNodes: Signal<RowNode<TData>[]> = computed(() =>
    this.pinnedBottomSig().map((d, i) => {
      const node = this.getOrCreateNode(d, `pinned-bottom-${i}`, 0, null);
      untracked(() => node.rowPinned.set('bottom'));
      return node;
    }),
  );

  readonly rowCount: Signal<number> = computed(() => this.displayedRows().length);

  getNodeById(id: string): RowNode<TData> | undefined {
    return this.nodeCache.get(id);
  }

  expandAll(expand: boolean): void {
    for (const node of this.nodeCache.values()) {
      if (node.group) node.setExpanded(expand);
    }
  }
}
