import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { FtTableComponent, type ColDef, type ColumnGroupDef, type GridOptions } from 'fast-table';
import { makePeople, type Person } from '../demo-data';

@Component({
  selector: 'demo-basics',
  standalone: true,
  imports: [FtTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="demo-hint">
      Sortering (klik header, shift+klik for multi-sort), filtrering (kolonnefiltre, hurtigfilter, flydende filtre),
      paginering, kolonnestørrelse (dobbeltklik kant for autotilpas), træk-og-slip kolonneflytning, fastfrysning
      (højreklik) og kolonnegrupper. "Startdato" har <code>flex: 1</code> og fylder derfor den resterende plads i
      griddet — sæt <code>flex</code> på en eller flere kolonner for at undgå tomrum i højre side.
    </p>
    <div class="demo-grid-wrap">
      <ft-table [gridOptions]="gridOptions()" />
    </div>
  `,
})
export class BasicsSectionComponent {
  readonly rowData = signal<Person[]>(makePeople(2000));

  readonly columnDefs: (ColDef<Person> | ColumnGroupDef<Person>)[] = [
    { field: 'id', headerName: 'ID', width: 80, pinned: 'left' },
    {
      groupId: 'identity',
      headerName: 'Identifikation',
      children: [
        { field: 'name', headerName: 'Navn', width: 160, filter: 'text', floatingFilter: true },
        { field: 'age', headerName: 'Alder', width: 100, type: 'number', filter: 'number' },
      ],
    },
    {
      groupId: 'location',
      headerName: 'Lokation',
      children: [
        { field: 'country', headerName: 'Land', width: 130, filter: 'set' },
        { field: 'city', headerName: 'By', width: 130, filter: 'text' },
      ],
    },
    { field: 'department', headerName: 'Afdeling', width: 130, filter: 'set' },
    {
      field: 'salary',
      headerName: 'Løn',
      width: 130,
      type: 'number',
      filter: 'number',
      valueFormatter: (p) => (p.value == null ? '' : `${Number(p.value).toLocaleString('da-DK')} kr`),
    },
    { field: 'active', headerName: 'Aktiv', width: 90 },
    { field: 'joined', headerName: 'Startdato', width: 130, minWidth: 130, flex: 1, type: 'date', filter: 'date', floatingFilter: true },
  ];

  readonly gridOptions = computed<GridOptions<Person>>(() => ({
    columnDefs: this.columnDefs,
    rowData: this.rowData(),
    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],
  }));
}
