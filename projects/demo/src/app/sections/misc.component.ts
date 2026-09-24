import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { FtTableComponent, type ColDef, type GridOptions } from 'fast-table';
import { makePeople, type Person } from '../demo-data';

@Component({
  selector: 'demo-misc',
  standalone: true,
  imports: [FtTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="demo-hint">
      Hold musen over en celle for at se et lille hjørne-mærke i øverste højre hjørne — klik det for at
      tilføje/redigere en kommentar til cellen (gul markør = kommentar findes). Træk i "⠿"-håndtaget i ID-kolonnen
      for at omarrangere rækker (træk-og-slip). Skift "rtl" herunder for at se højre-mod-venstre-understøttelse.
      Griddet bruger ARIA-roller (grid/row/gridcell/columnheader) og fuld tastaturnavigation for tilgængelighed.
    </p>
    <div class="demo-toolbar-extra">
      <label><input type="checkbox" [checked]="rtl()" (change)="rtl.set(!rtl())" /> RTL-layout</label>
    </div>
    <div class="demo-grid-wrap">
      <ft-table [gridOptions]="gridOptions()" />
    </div>
  `,
})
export class MiscSectionComponent {
  readonly rowData = signal<Person[]>(makePeople(60));
  readonly rtl = signal(false);

  readonly columnDefs: ColDef<Person>[] = [
    { field: 'id', headerName: 'ID', width: 90, rowDrag: true },
    { field: 'name', headerName: 'Navn', width: 160 },
    { field: 'country', headerName: 'Land', width: 130 },
    { field: 'department', headerName: 'Afdeling', width: 140 },
    { field: 'age', headerName: 'Alder', width: 100, type: 'number' },
  ];

  readonly gridOptions = computed<GridOptions<Person>>(() => ({
    columnDefs: this.columnDefs,
    rowData: this.rowData(),
    getRowId: ({ data }) => String(data.id),
    rtl: this.rtl(),
  }));
}
