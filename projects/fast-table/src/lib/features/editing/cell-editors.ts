import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  AfterViewInit,
  input,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CellEditorComponent, CellEditorParams } from '../../models/column-def';

@Component({
  selector: 'ft-text-editor',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<input
    #inputEl
    class="ft-cell-editor-input"
    type="text"
    [(ngModel)]="value"
    (keydown.enter)="commit()"
    (keydown.escape)="cancel()"
    (blur)="commit()"
  />`,
})
export class TextCellEditorComponent implements CellEditorComponent, AfterViewInit {
  readonly params = input.required<CellEditorParams>();
  readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('inputEl');
  value = '';
  /** Removing the editor's DOM node on Escape/cancel fires a native 'blur'
   *  event, which would otherwise re-trigger commit() with whatever the user
   *  had typed — this flag makes cancel() win that race. */
  private cancelled = false;

  ngOnInit(): void {
    this.value = this.params().value == null ? '' : String(this.params().value);
  }

  ngAfterViewInit(): void {
    const el = this.inputEl()?.nativeElement;
    el?.focus();
    el?.select();
  }

  getValue(): unknown {
    return this.value;
  }

  commit(): void {
    if (this.cancelled) return;
    this.params().setValue(this.getValue());
    this.params().stopEditing();
  }

  cancel(): void {
    this.cancelled = true;
    this.params().stopEditing(true);
  }
}

@Component({
  selector: 'ft-number-editor',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<input
    #inputEl
    class="ft-cell-editor-input"
    type="number"
    [(ngModel)]="value"
    (keydown.enter)="commit()"
    (keydown.escape)="cancel()"
    (blur)="commit()"
  />`,
})
export class NumberCellEditorComponent implements CellEditorComponent, AfterViewInit {
  readonly params = input.required<CellEditorParams>();
  readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('inputEl');
  value: number | null = null;
  private cancelled = false;

  ngOnInit(): void {
    this.value = typeof this.params().value === 'number' ? (this.params().value as number) : null;
  }

  ngAfterViewInit(): void {
    const el = this.inputEl()?.nativeElement;
    el?.focus();
    el?.select();
  }

  getValue(): unknown {
    return this.value;
  }

  commit(): void {
    if (this.cancelled) return;
    this.params().setValue(this.getValue());
    this.params().stopEditing();
  }

  cancel(): void {
    this.cancelled = true;
    this.params().stopEditing(true);
  }
}

@Component({
  selector: 'ft-date-editor',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<input
    #inputEl
    class="ft-cell-editor-input"
    type="date"
    [(ngModel)]="value"
    (keydown.enter)="commit()"
    (keydown.escape)="cancel()"
    (blur)="commit()"
  />`,
})
export class DateCellEditorComponent implements CellEditorComponent, AfterViewInit {
  readonly params = input.required<CellEditorParams>();
  readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('inputEl');
  value = '';
  private cancelled = false;

  ngOnInit(): void {
    const v = this.params().value;
    const d = v instanceof Date ? v : v ? new Date(v as string) : null;
    this.value = d && !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
  }

  ngAfterViewInit(): void {
    this.inputEl()?.nativeElement.focus();
  }

  getValue(): unknown {
    return this.value ? new Date(this.value) : null;
  }

  commit(): void {
    if (this.cancelled) return;
    this.params().setValue(this.getValue());
    this.params().stopEditing();
  }

  cancel(): void {
    this.cancelled = true;
    this.params().stopEditing(true);
  }
}

@Component({
  selector: 'ft-checkbox-editor',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<input
    #inputEl
    class="ft-cell-editor-checkbox"
    type="checkbox"
    [(ngModel)]="value"
    (change)="commit()"
    (keydown.escape)="cancel()"
  />`,
})
export class CheckboxCellEditorComponent implements CellEditorComponent, AfterViewInit {
  readonly params = input.required<CellEditorParams>();
  readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('inputEl');
  value = false;
  private cancelled = false;

  ngOnInit(): void {
    this.value = !!this.params().value;
  }

  ngAfterViewInit(): void {
    this.inputEl()?.nativeElement.focus();
  }

  getValue(): unknown {
    return this.value;
  }

  commit(): void {
    if (this.cancelled) return;
    this.params().setValue(this.getValue());
    this.params().stopEditing();
  }

  cancel(): void {
    this.cancelled = true;
    this.params().stopEditing(true);
  }
}

@Component({
  selector: 'ft-large-text-editor',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<textarea
    #inputEl
    class="ft-cell-editor-textarea"
    rows="4"
    [(ngModel)]="value"
    (keydown.escape)="cancel()"
    (blur)="commit()"
  ></textarea>`,
})
export class LargeTextCellEditorComponent implements CellEditorComponent, AfterViewInit {
  readonly params = input.required<CellEditorParams>();
  readonly inputEl = viewChild<ElementRef<HTMLTextAreaElement>>('inputEl');
  value = '';
  private cancelled = false;

  ngOnInit(): void {
    this.value = this.params().value == null ? '' : String(this.params().value);
  }

  ngAfterViewInit(): void {
    this.inputEl()?.nativeElement.focus();
  }

  getValue(): unknown {
    return this.value;
  }

  commit(): void {
    if (this.cancelled) return;
    this.params().setValue(this.getValue());
    this.params().stopEditing();
  }

  cancel(): void {
    this.cancelled = true;
    this.params().stopEditing(true);
  }
}

@Component({
  selector: 'ft-select-editor',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<select
    #selectEl
    class="ft-cell-editor-select"
    [(ngModel)]="value"
    (change)="commit()"
    (blur)="commit()"
    (keydown.escape)="cancel()"
  >
    @for (opt of options(); track opt) {
      <option [value]="opt">{{ opt }}</option>
    }
  </select>`,
})
export class SelectCellEditorComponent implements CellEditorComponent, AfterViewInit {
  readonly params = input.required<CellEditorParams>();
  readonly inputEl = viewChild<ElementRef<HTMLSelectElement>>('selectEl');
  value = '';
  private cancelled = false;

  options() {
    return (this.params().colDef.cellEditorParams?.['options'] as string[]) ?? [];
  }

  ngOnInit(): void {
    this.value = this.params().value == null ? '' : String(this.params().value);
  }

  ngAfterViewInit(): void {
    this.inputEl()?.nativeElement.focus();
  }

  getValue(): unknown {
    return this.value;
  }

  commit(): void {
    if (this.cancelled) return;
    this.params().setValue(this.getValue());
    this.params().stopEditing();
  }

  cancel(): void {
    this.cancelled = true;
    this.params().stopEditing(true);
  }
}
