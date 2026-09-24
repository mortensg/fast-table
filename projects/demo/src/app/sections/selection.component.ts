import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { FtTableComponent, type ColDef, type GridOptions } from 'fast-table';

interface Cell {
  row: string;
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
}

function makeSheet(): Cell[] {
  return Array.from({ length: 20 }, (_, i) => ({
    row: `Række ${i + 1}`,
    a: 10 + i,
    b: 20 + i * 2,
    c: 30 + i * 3,
    d: 40 + i * 4,
    e: 50 + i * 5,
  }));
}

@Component({
  selector: 'demo-selection',
  standalone: true,
  imports: [FtTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="demo-hint">
      Klik og træk for at markere et celleområde (statuslinjen nederst viser sum/gns/antal/min/maks for
      markeringen). Træk i det lille blå håndtag i nederste højre hjørne af markeringen for at udfylde en
      talrække. Tastaturgenveje: piletaster til navigation, Shift+piletaster for at udvide markeringen, Ctrl/Cmd+C
      for at kopiere, Ctrl/Cmd+V for at indsætte, Delete for at rydde, Ctrl/Cmd+Z/Y for fortryd/gentag. Højreklik for
      at oprette et diagram fra markeringen.
    </p>
    <div class="demo-grid-wrap">
      <ft-table [gridOptions]="gridOptions()" />
    </div>
  `,
})
export class SelectionSectionComponent {
  readonly rowData = signal<Cell[]>(makeSheet());

  readonly columnDefs: ColDef<Cell>[] = [
    { field: 'row', headerName: '', width: 110, pinned: 'left', sortable: false },
    { field: 'a', headerName: 'A', width: 90, type: 'number', editable: true },
    { field: 'b', headerName: 'B', width: 90, type: 'number', editable: true },
    { field: 'c', headerName: 'C', width: 90, type: 'number', editable: true },
    { field: 'd', headerName: 'D', width: 90, type: 'number', editable: true },
    { field: 'e', headerName: 'E', width: 90, type: 'number', editable: true },
  ];

  readonly gridOptions = computed<GridOptions<Cell>>(() => ({
    columnDefs: this.columnDefs,
    rowData: this.rowData(),
    cellSelection: { handle: { mode: 'fill' } },
    statusBar: { statusPanels: [{ key: 'aggregation' }, { key: 'selectedRows' }, { key: 'totalRows' }] },
  }));
}
