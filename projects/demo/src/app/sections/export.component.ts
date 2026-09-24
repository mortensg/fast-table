import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { FtTableComponent, type ColDef, type GridOptions } from 'fast-table';
import { makePeople, type Person } from '../demo-data';

@Component({
  selector: 'demo-export',
  standalone: true,
  imports: [FtTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="demo-hint">
      Brug værktøjslinjens CSV/Excel/PDF-knapper til at eksportere den aktuelt viste (filtrerede/sorterede) data.
      Excel-filen bruger SpreadsheetML (åbnes native i Excel med formatering), PDF genereres som et sideopdelt
      dokument. Markér et celleområde og tryk Ctrl/Cmd+C for at kopiere til udklipsholderen (indsæt i Excel/Sheets),
      eller Ctrl/Cmd+V for at indsætte kopieret data ind i markeringen.
    </p>
    <div class="demo-grid-wrap">
      <ft-table [gridOptions]="gridOptions()" />
    </div>
  `,
})
export class ExportSectionComponent {
  readonly rowData = signal<Person[]>(makePeople(300));

  readonly columnDefs: ColDef<Person>[] = [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'name', headerName: 'Navn', width: 160, editable: true },
    { field: 'country', headerName: 'Land', width: 130 },
    { field: 'department', headerName: 'Afdeling', width: 140 },
    {
      field: 'salary',
      headerName: 'Løn',
      width: 130,
      type: 'number',
      editable: true,
      valueFormatter: (p) => (p.value == null ? '' : `${Number(p.value).toLocaleString('da-DK')} kr`),
    },
    { field: 'joined', headerName: 'Startdato', width: 130, type: 'date' },
  ];

  readonly gridOptions = computed<GridOptions<Person>>(() => ({
    columnDefs: this.columnDefs,
    rowData: this.rowData(),
    cellSelection: true,
  }));
}
