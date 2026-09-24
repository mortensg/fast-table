import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
  inject,
  signal,
  effect,
} from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { RowNode } from '../../models/row-node';
import { Column } from '../../core/column';
import { ValueService } from '../../core/value-service';
import { EditingService } from '../../core/editing-service';
import { SelectionService } from '../../core/selection-service';
import { ColumnModel } from '../../core/column-model';
import { ContextMenuService } from '../../core/context-menu-service';
import { ClientSideRowModel } from '../../core/client-side-row-model';
import { CommentService } from '../../features/comments/comment-service';
import { FormsModule } from '@angular/forms';
import { FtIconComponent } from '../icon/ft-icon.component';
import type { CellEditorComponent, CellRendererComponent } from '../../models/column-def';
import {
  TextCellEditorComponent,
  NumberCellEditorComponent,
  DateCellEditorComponent,
  CheckboxCellEditorComponent,
  LargeTextCellEditorComponent,
  SelectCellEditorComponent,
} from '../../features/editing/cell-editors';
import {
  CheckboxCellRendererComponent,
  BadgeCellRendererComponent,
  SparklineCellRendererComponent,
} from '../../features/editing/cell-renderers';
import { FormulaCellEditorComponent } from '../../features/formula/formula-cell-editor.component';

const BUILT_IN_EDITORS: Record<string, any> = {
  text: TextCellEditorComponent,
  number: NumberCellEditorComponent,
  date: DateCellEditorComponent,
  checkbox: CheckboxCellEditorComponent,
  largeText: LargeTextCellEditorComponent,
  select: SelectCellEditorComponent,
  richSelect: SelectCellEditorComponent,
  formula: FormulaCellEditorComponent,
};

const BUILT_IN_RENDERERS: Record<string, any> = {
  checkbox: CheckboxCellRendererComponent,
  badge: BadgeCellRendererComponent,
  sparkline: SparklineCellRendererComponent,
};

@Component({
  selector: 'ft-cell',
  standalone: true,
  imports: [NgComponentOutlet, FormsModule, FtIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The component's own host element sits between .ft-row-center/.ft-row-pinned-*
  // (flex containers) and the inner .ft-cell div. Without display:contents that
  // host box is an unstyled default-display element, not a real flex item, so
  // .ft-cell never receives the parent's cross-axis stretch and shrinks to its
  // text content's height instead of the row's full height.
  styles: [':host { display: contents; }'],
  template: `
    <div
      class="ft-cell"
      role="gridcell"
      [attr.aria-selected]="isActive()"
      [class.ft-cell-editable]="isEditable()"
      [class.ft-cell-editing]="isEditing()"
      [class.ft-cell-selected]="isActive()"
      [class.ft-cell-in-range]="inRange()"
      [class.ft-range-top]="boundary()?.top"
      [class.ft-range-bottom]="boundary()?.bottom"
      [class.ft-range-left]="boundary()?.left"
      [class.ft-range-right]="boundary()?.right"
      [class.ft-cell-flash]="justUpdated()"
      [class.ft-cell-invalid]="hasValidationError()"
      [attr.title]="validationErrorMessage()"
      [class]="extraClass()"
      [style]="extraStyle()"
      [style.width.px]="spanWidth() ?? column().width()"
      (mousedown)="onMouseDown($event)"
      (mouseenter)="onMouseEnter()"
      (click)="onClick($event)"
      (dblclick)="onDblClick()"
      (contextmenu)="onContextMenu($event)"
    >
      @if (showGroupChrome()) {
        <span class="ft-group-indent" [style.width.px]="node().level * 18"></span>
        @if (node().group) {
          <span
            class="ft-group-toggle"
            [class.expanded]="node().expanded()"
            (click)="toggleGroup($event)"
          >
            <ft-icon name="chevron-right" />
          </span>
        } @else {
          <span class="ft-group-toggle-spacer"></span>
        }
      }
      @if (showDetailToggle()) {
        <span
          class="ft-group-toggle ft-detail-toggle"
          [class.expanded]="node().detailExpanded()"
          (click)="toggleDetail($event)"
        >
          <ft-icon name="chevron-right" />
        </span>
      }
      @if (column().colDef.rowDrag && !node().group) {
        <span class="ft-row-drag-handle" draggable="true" (dragstart)="onRowDragStart($event)">
          <ft-icon name="grip" />
        </span>
      }
      @if (showCheckbox()) {
        <input
          class="ft-row-checkbox"
          type="checkbox"
          [checked]="node().isSelected()"
          (click)="onCheckboxClick($event)"
        />
      }
      @if (node().group && groupColumnMode()) {
        <span class="ft-group-label" (click)="toggleGroup($event)"
          >{{ groupLabel() }} ({{ node().childCount }})</span
        >
      } @else if (isEditing()) {
        <ng-container
          [ngComponentOutlet]="editorType()"
          [ngComponentOutletInputs]="{ params: editorParams() }"
        />
      } @else if (rendererType()) {
        <ng-container
          [ngComponentOutlet]="rendererType()"
          [ngComponentOutletInputs]="{ params: rendererParams() }"
        />
      } @else {
        <span class="ft-cell-text">{{ formattedValue() }}</span>
      }
      @if (isActive() && showFillHandle()) {
        <div class="ft-fill-handle" (mousedown)="onFillHandleDown($event)"></div>
      }
      <button
        class="ft-comment-marker"
        [class.has-comment]="hasComment()"
        (click)="toggleCommentPopover($event)"
        title="Kommentar"
      >
        <ft-icon name="comment" />
      </button>
      @if (commentPopoverOpen()) {
        <div class="ft-comment-popover" (click)="$event.stopPropagation()">
          <textarea class="ft-comment-textarea" [(ngModel)]="commentDraft" rows="3"></textarea>
          <div class="ft-comment-actions">
            <button class="ft-btn" (click)="saveComment()">Gem</button>
            <button class="ft-btn ft-btn-ghost" (click)="commentPopoverOpen.set(false)">Luk</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class FtCellComponent<TData = any> {
  readonly node = input.required<RowNode<TData>>();
  readonly column = input.required<Column<TData>>();
  readonly rowIndex = input.required<number>();
  readonly isGroupDisplayColumn = input<boolean>(false);
  readonly spanWidth = input<number | undefined>(undefined);

  private valueService = inject(ValueService<TData>);
  private editingService = inject(EditingService<TData>);
  private selectionService = inject(SelectionService<TData>);
  private columnModel = inject(ColumnModel<TData>);
  private contextMenuService = inject(ContextMenuService<TData>);
  private rowModel = inject(ClientSideRowModel<TData>);
  private commentService = inject(CommentService);

  readonly commentPopoverOpen = signal(false);
  commentDraft = '';

  /** Flashes a brief accent glow whenever the underlying value changes from
   *  under the user — a transaction, a formula recompute, a server push —
   *  so asynchronous updates read as "arrived", not as a silent jump cut. */
  readonly justUpdated = signal(false);
  private previousRawValue: unknown;
  private hasSeenValue = false;
  private flashTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const value = this.rawValue();
      if (!this.hasSeenValue) {
        this.hasSeenValue = true;
        this.previousRawValue = value;
        return;
      }
      if (value === this.previousRawValue) return;
      this.previousRawValue = value;
      clearTimeout(this.flashTimer);
      this.justUpdated.set(false);
      requestAnimationFrame(() => this.justUpdated.set(true));
      this.flashTimer = setTimeout(() => this.justUpdated.set(false), 650);
    });
  }

  readonly hasComment = computed(
    () =>
      this.commentService.version() &&
      this.commentService.hasComment(this.node().id, this.column().colId),
  );

  readonly validationErrorMessage = computed(
    () =>
      this.editingService.validationErrors().get(`${this.node().id}:${this.column().colId}`) ?? '',
  );
  readonly hasValidationError = computed(() => this.validationErrorMessage() !== '');

  toggleCommentPopover(event: MouseEvent): void {
    event.stopPropagation();
    this.commentDraft = this.commentService.getComment(this.node().id, this.column().colId) ?? '';
    this.commentPopoverOpen.set(!this.commentPopoverOpen());
  }

  saveComment(): void {
    this.commentService.setComment(this.node().id, this.column().colId, this.commentDraft);
    this.commentPopoverOpen.set(false);
  }

  readonly formattedValue = computed(() =>
    this.valueService.getFormattedValue(this.column(), this.node()),
  );
  readonly rawValue = computed(() => this.valueService.getValue(this.column(), this.node()));

  readonly isEditable = computed(() =>
    this.column().isEditable({
      data: this.node().data,
      node: this.node(),
      colId: this.column().colId,
      api: null,
    }),
  );

  readonly isEditing = computed(() => {
    const editing = this.editingService.editingCell();
    if (editing && editing.node === this.node() && editing.colId === this.column().colId)
      return true;
    return this.editingService.editingRowId() === this.node().id && this.isEditable();
  });

  readonly isActive = computed(() => {
    const active = this.selectionService.activeCell();
    return !!active && active.rowIndex === this.rowIndex() && active.colId === this.column().colId;
  });

  readonly inRange = computed(() =>
    this.selectionService.isCellInRange(this.rowIndex(), this.column().colId),
  );
  readonly boundary = computed(() =>
    this.selectionService.isRangeBoundary(this.rowIndex(), this.column().colId),
  );
  readonly showFillHandle = computed(() => this.boundary()?.bottom && this.boundary()?.right);

  readonly extraClass = computed(() => {
    const fn = this.column().colDef.cellClass;
    if (!fn) return '';
    if (typeof fn === 'function') {
      const result = fn({ value: this.rawValue(), data: this.node().data, node: this.node() });
      return Array.isArray(result) ? result.join(' ') : (result ?? '');
    }
    return Array.isArray(fn) ? fn.join(' ') : fn;
  });

  readonly extraStyle = computed(() => {
    const fn = this.column().colDef.cellStyle;
    if (!fn) return {};
    if (typeof fn === 'function')
      return fn({ value: this.rawValue(), data: this.node().data, node: this.node() });
    return fn;
  });

  readonly rendererType = computed(() => {
    const r = this.column().colDef.cellRenderer;
    if (!r) return null;
    if (typeof r === 'string') return BUILT_IN_RENDERERS[r] ?? null;
    return r;
  });

  readonly rendererParams = computed(() => ({
    value: this.rawValue(),
    data: this.node().data,
    node: this.node(),
    colDef: this.column().colDef,
    api: null,
  }));

  readonly editorType = computed(() => {
    const e = this.column().colDef.cellEditor;
    if (!e)
      return this.column().colDef.allowFormula
        ? FormulaCellEditorComponent
        : TextCellEditorComponent;
    if (typeof e === 'string') return BUILT_IN_EDITORS[e] ?? TextCellEditorComponent;
    return e;
  });

  readonly editorParams = computed(() => ({
    value: this.rawValue(),
    data: this.node().data,
    node: this.node(),
    colDef: this.column().colDef,
    api: null,
    stopEditing: (cancel?: boolean) => this.stopEditing(cancel),
    setValue: (v: unknown) => this.commit(v),
  }));

  /** True if the last commit attempt for this cell was rejected by validation —
   *  editors check this before closing so an invalid entry keeps the field
   *  open (with the error shown via hasValidationError) instead of silently
   *  reverting with no feedback. */
  lastCommitRejected = false;

  /** Selection starts on mousedown (not click) so a drag can extend the range
   *  as the mouse moves — preventDefault here is also what stops the browser
   *  from starting a native text-selection drag over the cells. */
  onMouseDown(event: MouseEvent): void {
    if (event.button !== 0) return;
    event.preventDefault();
    this.selectionService.activeCell.set({ rowIndex: this.rowIndex(), colId: this.column().colId });
    if (event.shiftKey) {
      this.selectionService.extendRange(this.rowIndex(), this.column().colId);
    } else {
      this.selectionService.startRange(
        this.rowIndex(),
        this.column().colId,
        event.ctrlKey || event.metaKey,
      );
    }
    this.selectionService.rangeDragging.set(true);
  }

  onMouseEnter(): void {
    if (this.selectionService.rangeDragging()) {
      this.selectionService.extendRange(this.rowIndex(), this.column().colId);
    }
  }

  onClick(event: MouseEvent): void {
    if (this.column().colDef.singleClickEdit && this.isEditable()) {
      this.editingService.startEdit(this.node(), this.column().colId);
    }
  }

  onDblClick(): void {
    if (this.isEditable()) this.editingService.startEdit(this.node(), this.column().colId);
  }

  stopEditing(cancel = false): void {
    if (!cancel && this.lastCommitRejected) return;
    this.editingService.stopEdit(cancel);
  }

  private commit(value: unknown): void {
    this.lastCommitRejected = !this.editingService.commitValue(
      this.node(),
      this.column().colId,
      value,
      'edit',
    );
  }

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.selectionService.activeCell.set({ rowIndex: this.rowIndex(), colId: this.column().colId });
    this.contextMenuService.open(event.clientX, event.clientY, this.node(), this.column().colId);
  }

  onRowDragStart(event: DragEvent): void {
    event.dataTransfer?.setData('application/x-ft-row-id', this.node().id);
    event.dataTransfer!.effectAllowed = 'move';
  }

  onFillHandleDown(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    this.selectionService.fillHandleActive.set(true);
  }

  readonly groupColumnMode = computed(() => this.isGroupDisplayColumn());
  readonly showGroupChrome = computed(
    () => this.isGroupDisplayColumn() && (this.node().level > 0 || this.node().group),
  );
  readonly showCheckbox = computed(() => !!this.column().colDef.checkboxSelection);
  readonly showDetailToggle = computed(
    () =>
      this.isGroupDisplayColumn() &&
      this.rowModel.masterDetailEnabled() &&
      !this.node().group &&
      !this.node().isDetailRow,
  );

  toggleDetail(event: MouseEvent): void {
    event.stopPropagation();
    this.node().toggleDetail();
  }

  groupLabel(): string {
    const node = this.node();
    if (node.field) {
      const groupCol = this.columnModel.getColumnByField(node.field);
      if (groupCol) return `${groupCol.headerName()}: ${node.key}`;
    }
    return node.key ?? '';
  }

  toggleGroup(event: MouseEvent): void {
    event.stopPropagation();
    this.node().toggleExpanded();
  }

  onCheckboxClick(event: MouseEvent): void {
    event.stopPropagation();
    this.selectionService.selectNode(this.node(), { addToSelection: true });
  }
}
