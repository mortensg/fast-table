import { Component, ChangeDetectionStrategy, signal, computed, viewChild } from '@angular/core';
import { FtTableComponent, type ColDef, type GridOptions } from 'fast-table';
import { makePeople, type Person } from '../demo-data';

@Component({
  selector: 'demo-aligned-grids',
  standalone: true,
  imports: [FtTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="demo-hint">
      To uafhængige ft-table-instanser koblet sammen via [alignedGrids] — horisontal rulning og kolonnebredder
      synkroniseres automatisk mellem dem. Prøv at rulle den øverste tabel sidelæns eller ændre en kolonnebredde.
    </p>
    <div class="demo-grid-wrap demo-grid-wrap-third">
      <ft-table #topGridEl [gridOptions]="topOptions()" [showToolbar]="false" [alignedGrids]="bottomGrid() ? [bottomGrid()!] : []" />
    </div>
    <div class="demo-grid-wrap demo-grid-wrap-third">
      <ft-table #bottomGridEl [gridOptions]="bottomOptions()" [alignedGrids]="topGrid() ? [topGrid()!] : []" />
    </div>
  `,
})
export class AlignedGridsSectionComponent {
  readonly rowData = signal<Person[]>(makePeople(80));

  readonly topGrid = viewChild<FtTableComponent<Person>>('topGridEl');
  readonly bottomGrid = viewChild<FtTableComponent<Person>>('bottomGridEl');

  readonly columnDefs: ColDef<Person>[] = [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'name', headerName: 'Navn', width: 160 },
    { field: 'country', headerName: 'Land', width: 130 },
    { field: 'city', headerName: 'By', width: 130 },
    { field: 'department', headerName: 'Afdeling', width: 140 },
    { field: 'age', headerName: 'Alder', width: 100, type: 'number' },
  ];

  readonly topOptions = computed<GridOptions<Person>>(() => ({
    columnDefs: this.columnDefs,
    rowData: this.rowData().slice(0, 40),
  }));

  readonly bottomOptions = computed<GridOptions<Person>>(() => ({
    columnDefs: this.columnDefs,
    rowData: this.rowData().slice(40),
  }));
}
