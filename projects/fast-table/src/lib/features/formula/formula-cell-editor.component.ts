import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  AfterViewInit,
  input,
  viewChild,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CellEditorComponent, CellEditorParams } from '../../models/column-def';
import { BUILT_IN_FUNCTIONS } from './formula-engine';

const FUNCTION_NAMES = Object.keys(BUILT_IN_FUNCTIONS);

@Component({
  selector: 'ft-formula-editor',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ft-formula-editor">
      <input
        #inputEl
        class="ft-cell-editor-input ft-formula-input"
        type="text"
        [(ngModel)]="value"
        (ngModelChange)="onInput($event)"
        (keydown.enter)="commit()"
        (keydown.escape)="cancel()"
        (blur)="commit()"
      />
      @if (suggestions().length) {
        <div class="ft-formula-suggestions">
          @for (fn of suggestions(); track fn) {
            <div class="ft-formula-suggestion" (mousedown)="applySuggestion(fn)">{{ fn }}(...)</div>
          }
        </div>
      }
    </div>
  `,
})
export class FormulaCellEditorComponent implements CellEditorComponent, AfterViewInit {
  readonly params = input.required<CellEditorParams>();
  readonly inputEl = viewChild<ElementRef<HTMLInputElement>>('inputEl');
  value = '';
  readonly suggestions = signal<string[]>([]);
  private cancelled = false;

  ngOnInit(): void {
    const p = this.params();
    const field = p.colDef.field;
    const raw = field ? (p.data as Record<string, unknown> | undefined)?.[field] : p.value;
    this.value = raw === undefined || raw === null ? '' : String(raw);
  }

  ngAfterViewInit(): void {
    const el = this.inputEl()?.nativeElement;
    el?.focus();
    el?.select();
  }

  onInput(value: string): void {
    const match = value.match(/=?([A-Za-z]{1,})$/);
    if (match && value.startsWith('=')) {
      const partial = match[1].toUpperCase();
      this.suggestions.set(FUNCTION_NAMES.filter((f) => f.startsWith(partial) && f !== partial));
    } else {
      this.suggestions.set([]);
    }
  }

  applySuggestion(fn: string): void {
    this.value = this.value.replace(/[A-Za-z]*$/, `${fn}(`);
    this.suggestions.set([]);
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
