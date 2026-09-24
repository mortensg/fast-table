import { Component, ChangeDetectionStrategy, input, computed, inject, signal } from '@angular/core';
import { RowNode } from '../../models/row-node';
import { Column } from '../../core/column';
import { ColumnModel } from '../../core/column-model';
import { SelectionService } from '../../core/selection-service';
import { EditingService } from '../../core/editing-service';
import { ClientSideRowModel } from '../../core/client-side-row-model';
import { ViewportModel } from '../../core/viewport-model';
import { FtCellComponent } from '../cell/ft-cell.component';
import { FtIconComponent } from '../icon/ft-icon.component';

@Component({
  selector: 'ft-row',
  standalone: true,
  imports: [FtCellComponent, FtIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="ft-row"
      role="row"
      [attr.aria-selected]="node().isSelected()"
      [class.ft-row-selected]="node().isSelected()"
      [class.ft-row-group]="node().group"
      [class.ft-row-even]="rowIndex() % 2 === 0"
      [class.ft-row-pressed]="pressed()"
      [class]="rowClass()"
      [style.transform]="'translateY(' + top() + 'px)'"
      [style.height.px]="height()"
      [style.--ft-i]="staggerIndex() ?? rowIndex()"
      (dragover)="onDragOver($event)"
      (drop)="onDrop($event)"
      (pointerdown)="onPressStart()"
      (pointerup)="onPressEnd()"
      (pointerleave)="onPressEnd()"
    >
      <div class="ft-row-surface">
        @if (leftCols().length) {
          <div class="ft-row-section ft-row-pinned-left" [style.width.px]="leftWidth()">
            @for (col of leftCols(); track col.colId) {
              <ft-cell
                [node]="node()"
                [column]="col"
                [rowIndex]="rowIndex()"
                [isGroupDisplayColumn]="isFirstColumn(col)"
              />
            }
          </div>
        }
        <div class="ft-row-section ft-row-center-clip">
          <div
            class="ft-row-center"
            [style.transform]="'translateX(' + (centerOffset() - scrollLeft()) + 'px)'"
            [style.width.px]="centerRenderWidth()"
          >
            @for (group of centerCellGroups(); track group.column.colId) {
              <ft-cell
                [node]="node()"
                [column]="group.column"
                [rowIndex]="rowIndex()"
                [isGroupDisplayColumn]="isFirstColumn(group.column)"
                [spanWidth]="group.width"
              />
            }
          </div>
        </div>
        @if (rightCols().length) {
          <div class="ft-row-section ft-row-pinned-right" [style.width.px]="rightWidth()">
            @for (col of rightCols(); track col.colId) {
              <ft-cell [node]="node()" [column]="col" [rowIndex]="rowIndex()" />
            }
          </div>
        }
        @if (isRowEditing()) {
          <div class="ft-row-edit-actions">
            <button
              class="ft-row-edit-btn ft-row-edit-save"
              (click)="saveRowEdit($event)"
              title="Gem række"
            >
              <ft-icon name="check" />
            </button>
            <button
              class="ft-row-edit-btn ft-row-edit-cancel"
              (click)="cancelRowEdit($event)"
              title="Annuller"
            >
              <ft-icon name="x" />
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class FtRowComponent<TData = any> {
  readonly node = input.required<RowNode<TData>>();
  readonly rowIndex = input.required<number>();
  readonly top = input.required<number>();
  readonly height = input.required<number>();
  readonly centerCols = input.required<Column<TData>[]>();
  readonly centerOffset = input.required<number>();
  readonly centerRenderWidth = input.required<number>();
  readonly rowClassFn = input<((node: RowNode<TData>) => string) | null>(null);
  /** Position in the currently rendered window, used only to cascade the reflow transition — distinct from `rowIndex`, which is the row's real position in the dataset. */
  readonly staggerIndex = input<number | undefined>(undefined);

  private columnModel = inject(ColumnModel<TData>);
  private selectionService = inject(SelectionService<TData>);
  private editingService = inject(EditingService<TData>);
  private rowModel = inject(ClientSideRowModel<TData>);
  private viewportModel = inject(ViewportModel<TData>);

  readonly scrollLeft = computed(() => this.viewportModel.scrollLeft());

  readonly pressed = signal(false);

  onPressStart(): void {
    this.pressed.set(true);
  }

  onPressEnd(): void {
    this.pressed.set(false);
  }

  onDragOver(event: DragEvent): void {
    if (event.dataTransfer?.types.includes('application/x-ft-row-id')) {
      event.preventDefault();
    }
  }

  onDrop(event: DragEvent): void {
    const sourceId = event.dataTransfer?.getData('application/x-ft-row-id');
    if (!sourceId) return;
    event.preventDefault();
    const targetEl = event.currentTarget as HTMLElement;
    const rect = targetEl.getBoundingClientRect();
    const position = event.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
    this.rowModel.moveRowByNodeId(sourceId, this.node().id, position);
  }

  readonly isRowEditing = computed(() => this.editingService.editingRowId() === this.node().id);

  saveRowEdit(event: MouseEvent): void {
    event.stopPropagation();
    this.editingService.stopRowEdit(false);
  }

  cancelRowEdit(event: MouseEvent): void {
    event.stopPropagation();
    this.editingService.stopRowEdit(true);
  }

  readonly leftCols = computed(() => this.columnModel.leftPinned());
  readonly rightCols = computed(() => this.columnModel.rightPinned());
  readonly leftWidth = computed(() => this.columnModel.leftTotalWidth());
  readonly rightWidth = computed(() => this.columnModel.rightTotalWidth());
  readonly rowClass = computed(() => this.rowClassFn()?.(this.node()) ?? '');

  readonly centerCellGroups = computed(() => {
    const cols = this.centerCols();
    const node = this.node();
    const groups: { column: Column<TData>; width: number }[] = [];
    let i = 0;
    while (i < cols.length) {
      const col = cols[i];
      const spanFn = col.colDef.colSpan;
      let span = 1;
      if (spanFn && !node.group && !node.isDetailRow) {
        span = Math.max(1, spanFn({ value: undefined, data: node.data, node }));
      }
      span = Math.min(span, cols.length - i);
      let width = 0;
      for (let j = 0; j < span; j++) width += cols[i + j].width();
      groups.push({ column: col, width });
      i += span;
    }
    return groups;
  });

  isFirstColumn(col: Column<TData>): boolean {
    const first = this.leftCols()[0] ?? this.columnModel.visibleColumns()[0];
    return first?.colId === col.colId;
  }
}
