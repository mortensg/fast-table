import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { FtTableComponent, type ColDef, type GridOptions } from 'fast-table';
import { makePeople, type Person } from '../demo-data';

interface FileNode {
  path: string[];
  size: number;
  type: string;
}

function makeFileTree(): FileNode[] {
  return [
    { path: ['src'], size: 0, type: 'folder' },
    { path: ['src', 'app.ts'], size: 4200, type: 'ts' },
    { path: ['src', 'lib'], size: 0, type: 'folder' },
    { path: ['src', 'lib', 'core.ts'], size: 8900, type: 'ts' },
    { path: ['src', 'lib', 'utils.ts'], size: 2100, type: 'ts' },
    { path: ['src', 'lib', 'components'], size: 0, type: 'folder' },
    { path: ['src', 'lib', 'components', 'table.ts'], size: 12400, type: 'ts' },
    { path: ['src', 'lib', 'components', 'table.scss'], size: 3300, type: 'scss' },
    { path: ['src', 'lib', 'components', 'cell.ts'], size: 6700, type: 'ts' },
    { path: ['docs'], size: 0, type: 'folder' },
    { path: ['docs', 'readme.md'], size: 1800, type: 'md' },
    { path: ['docs', 'guide.md'], size: 5400, type: 'md' },
    { path: ['package.json'], size: 900, type: 'json' },
  ];
}

@Component({
  selector: 'demo-grouping',
  standalone: true,
  imports: [FtTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="demo-hint">
      Rækkegruppering: klik "Σ Gruppe" i sidepanelet (⚙ Kolonner), eller brug de forudkonfigurerede grupper her (Land
      → Afdeling). Grupper kan foldes ud/ind, og "Løn" er aggregeret (sum). Nedenfor: trædata (filsystem) hvor
      hierarkiet kommer direkte fra dataene i stedet for gruppering.
    </p>
    <h3 class="demo-subheading">Rækkegruppering + aggregering</h3>
    <div class="demo-grid-wrap demo-grid-wrap-half">
      <ft-table [gridOptions]="groupOptions()" />
    </div>

    <h3 class="demo-subheading">Trædata (getDataPath)</h3>
    <div class="demo-grid-wrap demo-grid-wrap-half">
      <ft-table [gridOptions]="treeOptions()" />
    </div>
  `,
})
export class GroupingSectionComponent {
  readonly rowData = signal<Person[]>(makePeople(400));
  readonly fileData = signal<FileNode[]>(makeFileTree());

  readonly groupColumnDefs: ColDef<Person>[] = [
    { field: 'name', headerName: 'Navn', width: 160 },
    { field: 'country', headerName: 'Land', width: 130, rowGroup: true, hide: true },
    { field: 'department', headerName: 'Afdeling', width: 140, rowGroup: true, hide: true },
    { field: 'age', headerName: 'Alder', width: 90, type: 'number' },
    {
      field: 'salary',
      headerName: 'Løn',
      width: 130,
      type: 'number',
      aggFunc: 'sum',
      valueFormatter: (p) => (p.value == null ? '' : `${Number(p.value).toLocaleString('da-DK')} kr`),
    },
    { field: 'rating', headerName: 'Vurdering', width: 100, type: 'number', aggFunc: 'avg' },
  ];

  readonly groupOptions = computed<GridOptions<Person>>(() => ({
    columnDefs: this.groupColumnDefs,
    rowData: this.rowData(),
    groupDefaultExpanded: 1,
    rowSelection: 'multiple',
  }));

  readonly treeColumnDefs: ColDef<FileNode>[] = [
    { field: 'type', headerName: 'Type', width: 90 },
    { field: 'size', headerName: 'Størrelse (bytes)', width: 150, type: 'number' },
  ];

  readonly treeOptions = computed<GridOptions<FileNode>>(() => ({
    columnDefs: this.treeColumnDefs,
    rowData: this.fileData(),
    treeData: true,
    getDataPath: (data) => data.path,
    groupDefaultExpanded: -1,
  }));
}
