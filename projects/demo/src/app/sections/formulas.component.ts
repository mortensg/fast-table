import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { FtTableComponent, type ColDef, type GridOptions } from 'fast-table';

interface Budget {
  category: string;
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  total: string;
  average: string;
  flag: string;
}

function makeBudget(): Budget[] {
  const categories = ['Løn', 'Marketing', 'Drift', 'IT', 'Rejser', 'Kontor', 'Forskning'];
  return categories.map((category, i) => ({
    category,
    q1: 10000 + i * 1500,
    q2: 12000 + i * 1200,
    q3: 9000 + i * 1800,
    q4: 15000 + i * 900,
    total: `=SUM(B${i + 1}:E${i + 1})`,
    average: `=AVERAGE(B${i + 1}:E${i + 1})`,
    flag: `=IF(F${i + 1}>50000,"Høj","Normal")`,
  }));
}

@Component({
  selector: 'demo-formulas',
  standalone: true,
  imports: [FtTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p class="demo-hint">
      Kolonnerne "Total", "Gennemsnit" og "Flag" er formelkolonner (allowFormula). Dobbeltklik en celle for at se og
      redigere den rå formel (fx =SUM(B1:E1), =AVERAGE(...), =IF(...)) — skriv "=" og et funktionsnavn for
      autofuldførelse. Cellereferencer (A1-notation) følger kolonnernes synlige rækkefølge (A=Kategori, B=Q1, ...).
    </p>
    <div class="demo-grid-wrap">
      <ft-table [gridOptions]="gridOptions()" />
    </div>
  `,
})
export class FormulasSectionComponent {
  readonly rowData = signal<Budget[]>(makeBudget());

  readonly columnDefs: ColDef<Budget>[] = [
    { field: 'category', headerName: 'Kategori', width: 140 },
    { field: 'q1', headerName: 'Q1', width: 100, type: 'number', editable: true },
    { field: 'q2', headerName: 'Q2', width: 100, type: 'number', editable: true },
    { field: 'q3', headerName: 'Q3', width: 100, type: 'number', editable: true },
    { field: 'q4', headerName: 'Q4', width: 100, type: 'number', editable: true },
    { field: 'total', headerName: 'Total', width: 130, allowFormula: true, editable: true },
    { field: 'average', headerName: 'Gennemsnit', width: 130, allowFormula: true, editable: true },
    { field: 'flag', headerName: 'Flag', width: 110, allowFormula: true, editable: true },
  ];

  readonly gridOptions = computed<GridOptions<Budget>>(() => ({
    columnDefs: this.columnDefs,
    rowData: this.rowData(),
  }));
}
