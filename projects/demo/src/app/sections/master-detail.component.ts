import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { FtTableComponent, type ColDef, type GridOptions } from 'fast-table';
import { makePeople, makeOrderLines, type Person, type OrderLine } from '../demo-data';

@Component({
  selector: 'demo-master-detail',
  standalone: true,
  imports: [FtTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="demo-hint">
      Klik pilen i venstre kolonne for at folde en ordrelinje-detaljetabel ud under rækken (uafhængig, indlejret
      ft-table-instans med egne kolonner og data).
    </p>
    <div class="demo-grid-wrap">
      <ft-table [gridOptions]="gridOptions()" />
    </div>
  `,
})
export class MasterDetailSectionComponent {
  readonly rowData = signal<Person[]>(makePeople(200));

  readonly columnDefs: ColDef<Person>[] = [
    { field: 'name', headerName: 'Kunde', width: 180 },
    { field: 'country', headerName: 'Land', width: 130 },
    { field: 'department', headerName: 'Afdeling', width: 140 },
    {
      field: 'salary',
      headerName: 'Løn',
      width: 130,
      type: 'number',
      valueFormatter: (p) => (p.value == null ? '' : `${Number(p.value).toLocaleString('da-DK')} kr`),
    },
  ];

  readonly detailColDefs: ColDef<OrderLine>[] = [
    { field: 'product', headerName: 'Produkt', width: 160 },
    { field: 'quantity', headerName: 'Antal', width: 100, type: 'number' },
    {
      field: 'price',
      headerName: 'Pris',
      width: 120,
      type: 'number',
      valueFormatter: (p) => (p.value == null ? '' : `${Number(p.value).toLocaleString('da-DK')} kr`),
    },
  ];

  readonly gridOptions = computed<GridOptions<Person>>(() => ({
    columnDefs: this.columnDefs,
    rowData: this.rowData(),
    masterDetail: {
      detailColDefs: this.detailColDefs,
      detailRowHeight: 160,
      getDetailRowData: ({ data }) => makeOrderLines(data.id),
    },
  }));
}
