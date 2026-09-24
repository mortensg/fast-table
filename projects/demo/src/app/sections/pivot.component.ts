import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { FtTableComponent, type ColDef, type GridOptions } from 'fast-table';
import { makePeople, type Person } from '../demo-data';

@Component({
  selector: 'demo-pivot',
  standalone: true,
  imports: [FtTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="demo-hint">
      Klik "⊞ Pivot" i værktøjslinjen for at aktivere pivot-tilstand. "Afdeling" er sat op som rækkegruppe, "Land"
      som pivotkolonne, og "Løn" som værdikolonne (sum) — resultatet bliver krydstabuleret med en kolonne pr.
      land og totalkolonner. Du kan også ændre opsætningen i sidepanelet (⚙ Kolonner).
    </p>
    <div class="demo-grid-wrap">
      <ft-table [gridOptions]="gridOptions()" />
    </div>
  `,
})
export class PivotSectionComponent {
  readonly rowData = signal<Person[]>(makePeople(600));

  readonly columnDefs: ColDef<Person>[] = [
    { field: 'name', headerName: 'Navn', width: 160 },
    { field: 'department', headerName: 'Afdeling', width: 140, rowGroup: true, hide: true },
    { field: 'country', headerName: 'Land', width: 130, pivot: true, hide: true },
    {
      field: 'salary',
      headerName: 'Løn',
      width: 130,
      type: 'number',
      aggFunc: 'sum',
      valueFormatter: (p) => (typeof p.value === 'number' ? `${p.value.toLocaleString('da-DK')} kr` : ''),
    },
  ];

  readonly gridOptions = computed<GridOptions<Person>>(() => ({
    columnDefs: this.columnDefs,
    rowData: this.rowData(),
    groupDefaultExpanded: -1,
  }));
}
