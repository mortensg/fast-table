import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { FtTableComponent, type ColDef, type GridOptions, type GridApi } from 'fast-table';
import { makePeople, DEPARTMENTS, type Person } from '../demo-data';

@Component({
  selector: 'demo-editing',
  standalone: true,
  imports: [FtTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="demo-hint">
      Dobbeltklik en celle for at redigere (tekst, tal, dato, afkrydsning, dropdown). "Alder" har validering (skal
      være 18-70). Højreklik en række → "Rediger hele rækken" for fuld rækkeredigering med Gem/Annuller. Brug
      værktøjslinjens Fortryd/Gentag. Knappen herunder simulerer højhastigheds-transaktioner (opdaterer 50 tilfældige
      lønninger hvert sekund).
    </p>
    <div class="demo-toolbar-extra">
      <button class="demo-btn" (click)="toggleTransactions()">
        {{ transacting() ? 'Stop transaktioner' : 'Start høj-hastigheds transaktioner' }}
      </button>
      <span class="demo-badge">Opdateringer: {{ updateCount() }}</span>
    </div>
    <div class="demo-grid-wrap">
      <ft-table [gridOptions]="gridOptions()" (gridReady)="onReady($event)" />
    </div>
  `,
})
export class EditingSectionComponent {
  readonly rowData = signal<Person[]>(makePeople(500));
  readonly transacting = signal(false);
  readonly updateCount = signal(0);
  private api: GridApi<Person> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;

  readonly columnDefs: ColDef<Person>[] = [
    { field: 'id', headerName: 'ID', width: 70, pinned: 'left' },
    { field: 'name', headerName: 'Navn', width: 160, editable: true, cellEditor: 'text' },
    {
      field: 'age',
      headerName: 'Alder',
      width: 100,
      type: 'number',
      editable: true,
      cellEditor: 'number',
      validators: [({ value }) => (typeof value === 'number' && value >= 18 && value <= 70 ? null : 'Skal være 18-70')],
    },
    {
      field: 'department',
      headerName: 'Afdeling',
      width: 150,
      editable: true,
      cellEditor: 'select',
      cellEditorParams: { options: DEPARTMENTS },
    },
    {
      field: 'salary',
      headerName: 'Løn',
      width: 130,
      type: 'number',
      editable: true,
      cellEditor: 'number',
      valueFormatter: (p) => (p.value == null ? '' : `${Number(p.value).toLocaleString('da-DK')} kr`),
    },
    { field: 'active', headerName: 'Aktiv', width: 90, editable: true, cellEditor: 'checkbox' },
    { field: 'joined', headerName: 'Startdato', width: 130, type: 'date', editable: true, cellEditor: 'date' },
  ];

  readonly gridOptions = computed<GridOptions<Person>>(() => ({
    columnDefs: this.columnDefs,
    rowData: this.rowData(),
    getRowId: ({ data }) => String(data.id),
    undoRedoCellEditing: true,
    undoRedoLimit: 50,
  }));

  onReady(api: GridApi<Person>): void {
    this.api = api;
  }

  toggleTransactions(): void {
    if (this.transacting()) {
      if (this.timer) clearInterval(this.timer);
      this.timer = null;
      this.transacting.set(false);
      return;
    }
    this.transacting.set(true);
    this.timer = setInterval(() => {
      if (!this.api) return;
      const rows = this.api.getRowData();
      const updates = Array.from({ length: 50 }, () => {
        const row = rows[Math.floor(Math.random() * rows.length)];
        return { ...row, salary: 30000 + Math.floor(Math.random() * 70000) };
      });
      this.api.applyTransaction({ update: updates });
      this.updateCount.update((c) => c + updates.length);
    }, 1000);
  }
}
